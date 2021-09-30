const { drive } = require("../gAuth");

const listFile = (param1, res, callback) => {
  drive.files.list(
    {
      q: "'" + param1 + "' in parents and trashed=false",
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
        console.log(data.files);
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
