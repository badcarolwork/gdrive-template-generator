const { drive } = require("../gAuth");

const listFile = (parentID, callback) => {
  drive.files.list(
    {
      q: "'" + parentID + "' in parents and trashed=false",
      fields: "files(id, name)",
    },
    (err, { data }) => {
      if (err) {
        res.send({
          status: 500,
          message: "FAILED: get file list API failed to proceed",
        });
      }

      if (data.files) {
        let x = data.files;
        callback(x);
      } else {
        res.send({
          status: 404,
          message: "No files found",
        });
      }
    }
  );
};

module.exports = {
  listFile,
};
