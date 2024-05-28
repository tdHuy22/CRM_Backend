const { mqttMosquittoServer } = require("../config/mosquittoMQTT");
const {
  getDeviceID,
  getCourseIDroomID,
  getScheduleCourseID,
  getStudentCourseID,
  updateAttendanceTrue,
  updateDeviceStatus,
} = require("./firestore");
const { getStudentIDScheduleID } = require("./stringModify");
const mqtt = require("mqtt");

const client = mqtt.connect(mqttMosquittoServer);

const getDataOfDate = async (req, res, next) => {
  try {
    const date = req.body.date;
    client.publish("server", `GET-${date}`);
    console.log(`Publish to server a message: GET-${date}`);
    res.status(200);
    res.send(`Getting data of date ${date}`);
  } catch (error) {
    next(error);
  }
};

const postDateOfDate = async (req, res, next) => {
  try {
    const date = req.body.date;
    client.publish("server", `POST-${date}`);
    console.log(`Publish to server a message: POST-${date}`);
    const deviceList = await getDeviceID();
    deviceList.map(async (device) => {
      const courseIDList = await getCourseIDroomID(device.roomID);
      let messageLength = 0;
      Promise.all(
        courseIDList.map(async (courseID) => {
          const scheduleList = await getScheduleCourseID(courseID, date);
          if (scheduleList.length > 0) {
            const studentList = await getStudentCourseID(courseID);
            messageLength += studentList.length * scheduleList.length;
            studentList.forEach((student) => {
              // client.publish(
              //   `device/${device.id}`,
              //   `${student}-${scheduleList[0].id}-${courseID}-${scheduleList[0].startTime}-${scheduleList[0].endTime}`
              // );
              const message = {
                deviceID: device.id,
                studentID: student,
                scheduleID: scheduleList[0].id,
                courseID: courseID,
                startTime: scheduleList[0].startTime,
                endTime: scheduleList[0].endTime,
              };
              client.publish("server", JSON.stringify(message));
              console.log(
                `Publish to device/${device.id} a message: ${student}-${scheduleList[0].id}-${courseID}-${scheduleList[0].startTime}-${scheduleList[0].endTime}`
              );
            });
          } else {
            console.log(`No schedule for course ${courseID}`);
          }
        })
      ).then(() => {
        const message = {
          deviceID: device.id,
          messageLength: messageLength,
          method: "POST",
        };
        client.publish("server", JSON.stringify(message));
        console.log(
          `Publish to device/${device.id} a message: Total message length: ${messageLength}`
        );
      });
    });
    res.status(200);
    res.send(`Posting data of date ${date}`);
  } catch (error) {
    next(error);
  }
};

const checkStatus = (req, res, next) => {
  try {
    client.publish("server", "CDS");
    console.log("Publish to server a message: CDS");
    res.status(200);
    res.send("Checking device status");
  } catch (error) {
    next(error);
  }
};

const onConnect = () => {
  console.log("Connected to MQTT server");
  getDeviceID().then((list) => {
    list.map((device) => {
      client.subscribe(`device/${device.id}`);
      console.log(`Subscribed to device/${device.id}`);
    });
  });
};

const onMessage = (topic, message) => {
  // console.log(`Received message from ${topic}: ${message.toString()}`);
  getDeviceID().then((list) => {
    list.map((device) => {
      if (topic === `device/${device.id}`) {
        try {
          const parsedMessage = JSON.parse(message.toString());
          const { studentID, scheduleID } = parsedMessage;
          console.log(
            `Received message from ${topic}: ${studentID}-${scheduleID}`
          );
          updateAttendanceTrue(studentID, scheduleID)
            .then(() => {
              console.log(
                `Update attendance of student ${studentID} for schedule ${scheduleID} successfully`
              );
            })
            .catch((error) => {
              console.log(error);
            });
        } catch (error) {
          if (message.toString() === `CDS-${device.id}`) {
            updateDeviceStatus(device.id, "Ready")
              .then(() => {
                console.log(`Device ${device.id} is ready`);
              })
              .catch((error) => {
                console.log(error);
              });
          }
        }
      }
    });
  });
};

// const onMessage = async (topic, message) => {
//   const list = await getDeviceID();
//   console.log(`Received message from ${topic}: ${message.toString()}`);
//   list.map(async (device) => {
//     if (topic === `server/${device.id}` && message.toString() === "READY") {
//       console.log(`Device ${device.id} is ready`);
//       const courseIDList = await getCourseIDroomID(device.roomID);
//       let messageLength = 0;
//       Promise.all(
//         courseIDList.map(async (courseID) => {
//           const scheduleList = await getScheduleCourseID(courseID, date);
//           if (scheduleList.length > 0) {
//             const studentList = await getStudentCourseID(courseID);
//             messageLength += studentList.length * scheduleList.length;
//             studentList.forEach((student) => {
//               client.publish(
//                 "device/0",
//                 `${student}-${scheduleList[0].id}-${courseID}-${scheduleList[0].startTime}-${scheduleList[0].endTime}`
//               );
//               console.log(
//                 `Publish to device/0 a message: ${student}-${scheduleList[0].id}-${courseID}-${scheduleList[0].startTime}-${scheduleList[0].endTime}`
//               );
//             });
//           } else {
//             console.log(`No schedule for course ${courseID}`);
//           }
//         })
//       ).then(() => {
//         client.publish("device/0", `Total message length: ${messageLength}`);
//         console.log(
//           `Publish to device/0 a message: Total message length: ${messageLength}`
//         );
//       });
//     }
//     if (
//       topic === `server/${device.id}` &&
//       message.toString().substring(0, 2) === "RS"
//     ) {
//       const { studentID, scheduleID } = getStudentIDScheduleID(
//         message.toString()
//       );
//       console.log(`Received message from ${topic}: ${studentID}-${scheduleID}`);
//       await updateAttendanceTrue(studentID, scheduleID);
//     }
//   });
// };

module.exports = {
  client,
  onConnect,
  onMessage,
  checkStatus,
  postDateOfDate,
  getDataOfDate,
};
