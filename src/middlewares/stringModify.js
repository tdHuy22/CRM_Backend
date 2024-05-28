const getStudentIDScheduleID = (message) => {
  if (typeof message !== "string") {
    throw new Error("Input must be a string");
  }

  const parts = message.split("RS-", 2);

  if (parts.length < 2) {
    throw new Error("Message must contain 'RS'-, studentID and scheduleID");
  }

  const ids = parts[1].split("-");

  if (ids.length < 2) {
    throw new Error("Message must contain studentID and scheduleID");
  }

  const [studentID, scheduleID] = ids;

  if (!studentID || !scheduleID) {
    throw new Error("studentID and scheduleID must not be empty");
  }

  return { studentID, scheduleID };
};

module.exports = { getStudentIDScheduleID };
