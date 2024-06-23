const { options } = require("../config/flespiMQTT");
const {
  getDeviceID,
  getCourseIDroomID,
  getScheduleCourseID,
  getStudentCourseID,
  updateAttendanceTrue,
  updateDeviceStatus,
  updateAttendanceFalse,
  getInfoCourseFromRFID,
  updateAttendanceWatching,
} = require("./firestore");
const {
  formattedDate,
  formattedTime,
  convertTimeToCronFormat,
} = require("./formattedDate");
const cron = require("node-cron");

let operationMode = "Automatic";
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
        deviceList.map((device) => {
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
    operationMode = "Automatic";
    console.log(`Set mode device to Automatic at ${time}`);
    startCron(time);
    res.status(200);
    res.send("Set mode device to Automatic");
  } catch (error) {
    next(error);
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
      if (device.roomID === "Online" || device.status !== "Ready") {
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
      deviceList.map((device) => {
        if (device.roomID !== "Online") {
          client.publish(`device/${device.id}/status`, "CDS");
          console.log(`Publish to device/${device.id} a message: CDS`);
        } else {
          client.publish(`device/${device.id}/status`, "CDSL");
          console.log(`Publish to device/${device.id} a message: CDSL`);
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
  getDeviceID().then((list) => {
    deviceList = list;
    deviceList.map((device) => {
      client.subscribe(`device/${device.id}/status/res`);
      client.subscribe(`device/${device.id}/updateAtt`);
      console.log(`Subscribed to device/${device.id}/status/res`);
      console.log(`Subscribed to device/${device.id}/updateAtt`);
    });
  });
};

const onMessage = (topic, message) => {
  // console.log(`Received message from ${topic}: ${message.toString()}`);
  deviceList.map((device) => {
    if (
      topic === `device/${device.id}/status/res` &&
      ((device.roomID !== "Online" &&
        message.toString() === `CDS-${device.id}`) ||
        (device.roomID === "Online" &&
          message.toString() === `CDSL-${device.id}`))
    ) {
      updateDeviceStatus(device.id, "Ready")
        .then(async () => {
          console.log(`Device ${device.id} is ready`);
          if (operationMode === "Automatic") {
            if (device.roomID === "Online" || device.status !== "Ready") {
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
              client.publish(
                `device/${device.id}/sPOST`,
                JSON.stringify(messageLen)
              );
              console.log(
                `Publish to device/${device.id} a message: ${JSON.stringify(
                  messageLen
                )}`
              );
            });
          }
        })
        .catch((error) => {
          console.log(error);
        });
    }
    if (
      topic === `device/${device.id}/updateAtt` &&
      device.roomID !== "Online"
    ) {
      const messageJson = JSON.parse(message.toString());
      console.log(
        `Received message from ${topic}: ${JSON.stringify(messageJson)}`
      );
      updateAttendanceTrue(messageJson.studentID, messageJson.scheduleID)
        .then(() => {
          console.log(
            `Update attendance of student ${messageJson.studentID} for schedule ${messageJson.scheduleID} successfully`
          );
        })
        .catch((error) => {
          console.log(error);
        });
    }
    if (
      topic === `device/${device.id}/updateAtt` &&
      device.roomID === "Online"
    ) {
      const messageJson = JSON.parse(message.toString());
      console.log(
        `Received message from ${topic}: ${JSON.stringify(messageJson)}`
      );
      if (messageJson.RFID) {
        if (operationMode === "Automatic") {
          currentDay = formattedDate(new Date());
          currentTime = formattedTime(new Date());
        }
        getInfoCourseFromRFID(messageJson.RFID, currentDay, currentTime).then(
          (info) => {
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
              updateAttendanceWatching(result.studentID, result.scheduleID);
            }
          }
        );
      } else if (messageJson.studentID) {
        if (messageJson.status === "SUCCESS") {
          updateAttendanceTrue(messageJson.studentID, messageJson.scheduleID)
            .then(() => {
              console.log(
                `Update attendance Present of student ${messageJson.studentID} for schedule ${messageJson.scheduleID} successfully`
              );
            })
            .catch((error) => {
              console.log(error);
            });
        } else {
          updateAttendanceFalse(messageJson.studentID, messageJson.scheduleID)
            .then(() => {
              console.log(
                `Update attendance Absent of student ${messageJson.studentID} for schedule ${messageJson.scheduleID} successfully`
              );
            })
            .catch((error) => {
              console.log(error);
            });
        }
      } else {
        console.log("Invalid message");
      }
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
