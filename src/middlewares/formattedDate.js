const formattedDate = (date) => {
  var day = String(date.getDate()).padStart(2, "0");
  var month = String(date.getMonth() + 1).padStart(2, "0"); //January is 0!
  var year = date.getFullYear();

  return day + "/" + month + "/" + year;
};

const formattedTime = (date) => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return hours + ":" + minutes;
};

const isTimeBWithinOneHour = (timeA, timeB) => {
  const [hoursA, minutesA] = timeA.split(":").map(Number);
  const [hoursB, minutesB] = timeB.split(":").map(Number);

  const dateA = new Date();
  dateA.setHours(hoursA, minutesA);

  const dateB = new Date();
  dateB.setHours(hoursB, minutesB);

  const dateAPlusOneHour = new Date(dateA.getTime() + 60 * 60 * 1000);

  // If time B is later than time A and earlier than time A + 1 hour, return true
  if (dateB > dateA && dateB < dateAPlusOneHour) {
    return true;
  }

  return false;
};

module.exports = { formattedDate, formattedTime, isTimeBWithinOneHour };
