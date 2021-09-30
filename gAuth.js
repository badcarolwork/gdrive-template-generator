const { google } = require("googleapis");
const keys = require("./drive-key.json");

const jwToken = new google.auth.JWT(
  keys.client_email,
  null,
  keys.private_key,
  ["https://www.googleapis.com/auth/drive"],
  null
);

jwToken.authorize((authErr) => {
  if (authErr) {
    console.log("can't get anything_ " + authErr);
    return;
  } else {
    console.log("authoriation ok");
  }
});

const drive = google.drive({ version: "v3", auth: jwToken });

module.exports = {
  drive,
};
