const { options } = require("../config/flespiMQTT");
const {
  getDeviceID,
  getCourseIDroomID,
  getScheduleCourseID,
  getStudentCourseID,
  updateDeviceStatus,
  getInfoCourseFromRFID,
  updateAttendance,
} = require("./firestore");
const {
  formattedDate,
  formattedTime,
  convertTimeToCronFormat,
} = require("./formattedDate");
const cron = require("node-cron");

let operationMode = "Manual";
let cronTask = null;

const mqtt = require("mqtt");

let deviceList = [];

const client = mqtt.connect(options);

const delay = (ms = 1000) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

let currentDay = "";
let currentTime = "";

const scheduleCron = (time) => {
  const checkTime = convertTimeToCronFormat(time);
  console.log(`Cron job scheduled at ${checkTime}`);
  cronTask = cron.schedule(checkTime, () => {
    console.log("Cron job running at 00:00 everyday");
    getDeviceID().then(
      (list) => {
        deviceList = list;
        list.map((device) => {
          client.subscribe(`device/${device.id}/status/res`);
          client.subscribe(`device/${device.id}/updateAtt`);
          console.log(`Subscribed to device/${device.id}/status/res`);
          console.log(`Subscribed to device/${device.id}/updateAtt`);
          if (device.roomID !== "Online") {
            client.publish(`device/${device.id}/status`, "CDS");
            console.log(`Publish to device/${device.id} a message: CDS`);
          } else {
            client.publish(`device/${device.id}/status`, "CDSL");
            console.log(`Publish to device/${device.id} a message: CDSL`);
          }
        });
      },
      { scheduled: false }
    ); // Run at 00:00 everyday
  });
};

const startCron = (time) => {
  if (cronTask === null) {
    scheduleCron(time);
    cronTask.start();
  }
};

const stopCron = () => {
  if (cronTask !== null) {
    cronTask.stop();
    cronTask = null;
    console.log("Cron job stopped");
  }
};

const setModeDevice = (req, res, next) => {
  try {
    const time = req.body.time;
    if (time === "") {
      res.status(400);
      res.send("Time is required");
      return;
    }
    operationMode = "Automatic";
    console.log(`Set mode device to Automatic at ${time}`);
    startCron(time);
    res.status(200);
    res.send("Set mode device to Automatic");
  } catch (error) {
    next(error);
  }
};

const postDateAutomatic = async (device) => {
  try {
    console.log(`Device ${device.id} is ready 96`);
    if (operationMode === "Automatic") {
      if (device.roomID === "Online") {
        console.log(`Device ${device.id} mode is Online`);
        return;
      }
      currentDay = formattedDate(new Date());
      const courseIDList = await getCourseIDroomID(device.roomID);
      client.publish(`device/${device.id}/sPOST`, `POST-${currentDay}`);
      console.log(
        `Publish to device/${device.id} a message: POST-${currentDay}`
      );
      let messageLength = 0;
      Promise.all(
        courseIDList.map(async (course) => {
          const scheduleList = await getScheduleCourseID(
            course.courseID,
            currentDay
          );
          if (scheduleList.length > 0) {
            const studentList = await getStudentCourseID(course.courseID);
            messageLength += studentList.length * scheduleList.length;
            for (const student of studentList) {
              const message = {
                studentID: student.studentID,
                RFID: student.RFID,
                courseID: course.courseID,
                scheduleID: scheduleList[0].id,
                startTime: course.startTime,
                endTime: course.endTime,
              };
              client.publish(
                `device/${device.id}/sPOST`,
                JSON.stringify(message)
              );
              console.log(
                `Publish to device/${device.id} a message:` +
                  JSON.stringify(message)
              );
            }
          } else {
            console.log(`No schedule for course ${course.id}`);
          }
        })
      ).then(() => {
        const messageLen = {
          messageLength: messageLength,
        };
        client.publish(`device/${device.id}/sPOST`, JSON.stringify(messageLen));
        console.log(
          `Publish to device/${device.id} a message: ${JSON.stringify(
            messageLen
          )}`
        );
      });
    } else {
      console.log("Operation mode is Manual");
    }
  } catch (error) {
    console.log(error);
  }
};

const postDateOfDate = async (req, res, next) => {
  try {
    operationMode = "Manual";
    stopCron();

    currentDay = req.body.date;
    currentTime = req.body.time;

    console.log(`Posting data of date ${currentDay}`);
    console.log(`Current time: ${currentTime}`);

    deviceList.map(async (device) => {
      if (device.roomID === "Online") {
        console.log(`Device ${device.id} is in Online mode`);
        return;
      } else if (device.status !== "Ready") {
        console.log(`Device ${device.id} is not ready`);
        return;
      }
      const courseIDList = await getCourseIDroomID(device.roomID);
      client.publish(`device/${device.id}/sPOST`, `POST-${currentDay}`);
      console.log(
        `Publish to device/${device.id} a message: POST-${currentDay}`
      );
      let messageLength = 0;
      Promise.all(
        courseIDList.map(async (course) => {
          const scheduleList = await getScheduleCourseID(
            course.courseID,
            currentDay
          );
          if (scheduleList.length > 0) {
            const studentList = await getStudentCourseID(course.courseID);
            messageLength += studentList.length * scheduleList.length;
            for (const student of studentList) {
              const message = {
                studentID: student.studentID,
                RFID: student.RFID,
                courseID: course.courseID,
                scheduleID: scheduleList[0].id,
                startTime: course.startTime,
                endTime: course.endTime,
              };
              client.publish(
                `device/${device.id}/sPOST`,
                JSON.stringify(message)
              );
              console.log(
                `Publish to device/${device.id} a message:` +
                  JSON.stringify(message)
              );
              // await delay(1000);
              // console.log("Delay 1s");
            }
          } else {
            console.log(`No schedule for course ${course.courseID}`);
          }
        })
      ).then(() => {
        if (messageLength === 0) {
          console.log("No message to post");
          return;
        }
        const messageLen = {
          messageLength: messageLength,
        };
        client.publish(`device/${device.id}/sPOST`, JSON.stringify(messageLen));
        console.log(
          `Publish to device/${device.id} a message: ${JSON.stringify(
            messageLen
          )}`
        );
      });
    });
    res.status(200);
    res.send(`Posting data of date ${currentDay}`);
  } catch (error) {
    next(error);
  }
};

const checkStatus = (req, res, next) => {
  try {
    getDeviceID().then((list) => {
      deviceList = list;
      list.map((device) => {
        client.subscribe(`device/${device.id}/status/res`);
        client.subscribe(`device/${device.id}/updateAtt`);
        console.log(`Subscribed to device/${device.id}/status/res`);
        console.log(`Subscribed to device/${device.id}/updateAtt`);
        switch (device.roomID) {
          case "Online":
            client.publish(`device/${device.id}/status`, "CDSL");
            console.log(`Publish to device/${device.id} a message: CDSL`);
            break;
          default:
            client.publish(`device/${device.id}/status`, "CDS");
            console.log(`Publish to device/${device.id} a message: CDS`);
            break;
        }
      });
    });
    res.status(200);
    res.send("Checking device status");
  } catch (error) {
    next(error);
  }
};

const onConnect = () => {
  console.log("Connected to MQTT server");
};

const onMessage = (topic, message) => {
  console.log(`Received message from ${topic}: ${message.toString()}`);
  deviceList.map(async (device) => {
    switch (device.roomID) {
      case "Online":
        switch (topic) {
          case `device/${device.id}/updateAtt`:
            const messageJson = JSON.parse(message.toString());
            console.log(
              `Received message from ${topic}: ${JSON.stringify(messageJson)}`
            );
            if ("RFID" in messageJson) {
              if (operationMode === "Automatic") {
                currentDay = formattedDate(new Date());
                currentTime = formattedTime(new Date());
              }
              console.log("RFID");
              getInfoCourseFromRFID(
                messageJson.RFID,
                currentDay,
                currentTime
              ).then(async (info) => {
                const result = info;
                if (result === null) {
                  console.log("Invalid RFID");
                  client.publish(`device/${device.id}/sPOST`, "LATE");
                } else {
                  client.publish(
                    `device/${device.id}/sPOST`,
                    JSON.stringify(result)
                  );
                  console.log(
                    `Publish to device/${device.id}/sPOST a message:` +
                      JSON.stringify(result)
                  );
                  const rs = await updateAttendance(
                    result.studentID,
                    result.scheduleID,
                    "Watching",
                    device
                  );
                  if (!rs) {
                    console.log(
                      "Update attendance Watching for device Online: FAILED",
                      device.id
                    );
                    return;
                  }
                  if (rs === device.id) {
                    console.log(
                      `Update attendance Watching of student ${rs.studentID} for schedule ${result.scheduleID} successfully`
                    );
                  }
                  delay(10000);
                }
              });
            } else if ("studentID" in messageJson) {
              switch (messageJson.status) {
                case "SUCCESS":
                  const result = await updateAttendance(
                    messageJson.studentID,
                    messageJson.scheduleID,
                    "Present",
                    device
                  );
                  if (!result) {
                    console.log(
                      "Update attendance Present for device Online: FAILED",
                      device.id
                    );
                    return;
                  }
                  if (result === device.id) {
                    console.log(
                      `Update attendance Present of student ${messageJson.studentID} for schedule ${messageJson.scheduleID} successfully`
                    );
                  }
                  delay(10000);
                  break;
                case "FAIL":
                  const rs = await updateAttendance(
                    messageJson.studentID,
                    messageJson.scheduleID,
                    "Absent",
                    device
                  );
                  if (!rs) {
                    console.log(
                      "Update attendance Absent for device Online: FAILED",
                      device.id
                    );
                    return;
                  }
                  if (rs === device.id) {
                    console.log(
                      `Update attendance Absent of student ${messageJson.studentID} for schedule ${messageJson.scheduleID} successfully`
                    );
                  }
                  delay(10000);
                  break;
                default:
                  console.log("Invalid message for device Online 351");
                  break;
              }
            } else {
              console.log("Invalid message for device Online 355");
            }
            break;
          case `device/${device.id}/status/res`:
            if (message.toString() === `CDSL-${device.id}`) {
              updateDeviceStatus(device.id, "Ready").then(() => {
                deviceList.find((d) => d.id === device.id).status = "Ready";
                postDateAutomatic(device);
              });
            }
            break;
          default:
            console.log(
              `Invalid topic for device Online 367: ${topic} in device ${device.id}`
            );
            break;
        }
        break;
      default:
        switch (topic) {
          case `device/${device.id}/status/res`:
            if (message.toString() === `CDS-${device.id}`) {
              updateDeviceStatus(device.id, "Ready").then(() => {
                deviceList.find((d) => d.id === device.id).status = "Ready";
                postDateAutomatic(device);
              });
            }
            break;
          case `device/${device.id}/updateAtt`:
            const messageJson = JSON.parse(message.toString());
            console.log(
              `Received message from ${topic}: ${JSON.stringify(messageJson)}`
            );
            const result = await updateAttendance(
              messageJson.studentID,
              messageJson.scheduleID,
              "Present",
              device
            );
            if (!result) {
              console.log(
                `Update attendance Present for device ${device.id}: FAILED`
              );
              return;
            }
            if (result === device.id) {
              console.log(
                `Update attendance Present of student ${messageJson.studentID} for schedule ${messageJson.scheduleID} successfully`
              );
            }
            break;
          default:
            console.log("Invalid topic for device Offline");
            break;
        }
        break;
    }
  });
};

module.exports = {
  client,
  onConnect,
  onMessage,
  checkStatus,
  postDateOfDate,
  setModeDevice,
};
