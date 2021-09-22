const express = require("express");
var app = express();

const { google } = require("googleapis");

const keys = require("./drive-api-auth.json");

const path = require("path");
const fs = require("fs");

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

const getFilesList = (folderID) => {
  const parents = "1uFcMQCtbOg02wnn5IibmMWxDfcBjNXQZ";
  drive.files.list(
    {
      auth: jwToken,
      pageSize: 10,
      q: "'" + parents + "' in parents and trashed=false",
      fields: "files(id, name)",
    },
    (err, { data }) => {
      if (err) return console.log("The API returned an error: " + err);
      const files = data.files;
      if (files.length) {
        console.log("Files:");
        files.forEach((file) => {
          // console.log(`${file.name} (${file.id})`);
          copyFiles(file.id, file.name);
        });
      } else {
        console.log("No files found.");
      }
    }
  );
};

/***********  need a create folder function ************/

const createNewfolder = () => {
  const folderName = "vib_" + Math.random().toString(36).substr(2, 9);

  var fileMetadata = {
    name: folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents: ["1PyNq5_KrhH9muhS5xnDwfkki-xY_EqNf"],
  };
  drive.files.create(
    {
      resource: fileMetadata,
      fields: "id",
    },
    function (err, file) {
      if (err) {
        // Handle error
        console.error(err);
      } else {
        // console.log(file.data.id);
        console.log("new folder is created");
        getFilesList(file.data.id);
      }
    }
  );
};

const copyFiles = async (fileID, fileName) => {
  drive.files.copy(
    {
      fileId: fileID,
      resource: { name: "copy_" + fileName },
    },
    function (err) {
      if (err) {
        console.log(err);
        // res.send("error");
        return;
      } else {
        console.log("One file is copied");
      }
    }
  );
};

const moveCopiedFilestoNewFolder = () => {
  fileId = "1sTWaJ_j7PkjzaBWtNc3IzovK5hQf21FbOw9yLeeLPNQ";
  folderId = "0BwwA4oUTeiV1TGRPeTVjaWRDY1E";
  // Retrieve the existing parents to remove
  drive.files.get(
    {
      fileId: fileId,
      fields: "parents",
    },
    function (err, file) {
      if (err) {
        // Handle error
        console.error(err);
      } else {
        // Move the file to the new folder
        var previousParents = file.parents.join(",");
        drive.files.update(
          {
            fileId: fileId,
            addParents: folderId,
            removeParents: previousParents,
            fields: "id, parents",
          },
          function (err, file) {
            if (err) {
              // Handle error
            } else {
              // File moved.
            }
          }
        );
      }
    }
  );
};

const downloadFile = () => {
  var dest = fs.createWriteStream("file.zip"); // Please set the filename of the saved file.
  drive.files.get(
    { fileId: "1uFcMQCtbOg02wnn5IibmMWxDfcBjNXQZ", alt: "media" },
    { responseType: "stream" },
    (err, { data }) => {
      if (err) {
        console.log(err);
        return;
      }
      data
        .on("end", () => console.log("Done."))
        .on("error", (err) => {
          console.log(err);
          return process.exit();
        })
        .pipe(dest);
    }
  );
};

// createNewfolder()

// app.set('view engine', 'ejs')
