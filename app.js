const express = require("express");
var app = express();

// const { google } = require("googleapis");
const { drive } = require("./gAuth");

const fs = require("fs");
const async = require("async");

const { listFile } = require("./components/getListComponent");
/// global setting ////

let topParentFolderId = "1PyNq5_KrhH9muhS5xnDwfkki-xY_EqNf"; // DO NOT CHANGE: folder ID generator folder on g drive
let mainTemplateFolderVIB320480 = "1uFcMQCtbOg02wnn5IibmMWxDfcBjNXQZ"; // folder ID of the template

/// END of global setting ////

/////********** Component STEP BY STEP  **********////////

// 1.createNewfolder
// 2.upload images
// 3.getFilesList
// 4.duplicateFiles // new promise done
// 5.moveCopiedFilestoNewFolder
// 6.renameFileinNewFolder
// 7.downloadNewFolder (shre folder and generate link)

/////********** END **********////////

/***********  need a create folder function ************/
const createNewfolder = () => {
  const newFolderName = "vib_" + Math.random().toString(36).substr(2, 9);

  var fileMetadata = {
    name: newFolderName,
    mimeType: "application/vnd.google-apps.folder", //  DO NOT CHANGE: Drive default folder type
    parents: [topParentFolderId], // create new folder under top parent folder (temp_generator)
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
        // console.log(file.data.id); // new folder ID
        console.log("new folder is created");
        getFilesList(file.data.id);
      }
    }
  );
};

const uploadImages = (newImageFolder) => {
  // const testID = "1CkpW6vJBXIvTayOwR1XWmSIIpp-A51zB";
  var fileMetadata = {
    name: "bottom.png",
    parents: [newImageFolder],
  };
  var media = {
    mimeType: "image/png",
    body: fs.createReadStream("./file/end-bottom.png"), // path from the API
  };
  drive.files.create(
    {
      resource: fileMetadata,
      media: media,
      fields: "id",
    },
    function (err, file) {
      if (err) {
        // Handle error
        console.error(err);
      } else {
        console.log("upload image completed");
      }
    }
  );
};
const getFilesList = (newFolderID) => {
  const parents = mainTemplateFolderVIB320480;
  const copyfilePromises = [];

  listFile(parents, (x) => {
    if (x.length) {
      for (const file of x) {
        copyfilePromises.push(duplicateFiles(file.id, file.name));
      }
      Promise.all(copyfilePromises)
        .then((results) => {
          // console.log("All done", results);
          // do move file here
        })
        .catch((results) => {
          console.log("Catch error: ", results);
        });
    } else {
      res.send({
        status: 404,
        message: "No files to copy.",
      });
    }
  });
};

const duplicateFiles = (mainFilesID, mainfilesName) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      drive.files.copy(
        {
          fileId: mainFilesID,
          resource: { name: "copy_" + mainfilesName },
        },
        (err, data) => {
          if (err) {
            console.log(err);
            res.send({
              status: 500,
              message: "Failed to copy files",
            });
            reject("Failed to copy files");
            // res.send("error");
            return;
          } else {
            console.log("One file is copied: " + data);
            resolve("duplicate file step: " + mainfilesName);
          }
        }
      );
    }, Math.floor(Math.random() * 1000));
  });
};

const moveCopiedFilestoNewFolder = (copyToFolderID) => {
  const folderId = copyToFolderID; // new folder ID
  // console.log(folderId);
  // return;
  let fileIdtoCopy = [];

  listFile(mainTemplateFolderVIB320480, (x) => {
    return new Promise((resolve, reject) => {
      if (x.length) {
        for (const file of data.files) {
          if (file.name.indexOf("copy_") > -1) {
            resolve("SUCCESS move file:", file.id);
            fileIdtoCopy.push(file.id);
          } else {
            reject("Move copied file failed.", file.id);
          }
        }
      } else {
        res.send({
          status: 404,
          message: "No files to move.",
        });
      }
    });
  });
};

const renameFileinNewFolder = (checkNewFolder) => {
  // const testID = "1A2a96xfVauugnQFqh158AIH67wmncGBw";
  drive.files.list(
    {
      q: "'" + checkNewFolder + "' in parents and trashed=false",
      fields: "files(id, name)",
    },
    (err, { data }) => {
      // console.log(data.files.name);
      if (err) {
        console.log("FAILED to rename the new files");
      }
      for (const file of data.files) {
        if (file.name.indexOf("copy_") > -1) {
          const renamedFile = file.name.slice(5);

          drive.files.update(
            {
              fileId: file.id,
              resource: { name: renamedFile },
            },
            (err, res) => {
              if (err) return console.log("The API returned an error: " + err);
              else {
                console.log();
              }
            }
          );
        }
      }
    }
  );
};

const setPermissionGetDownloadLink = async (getDownloadFolderId) => {
  // var fileId = "1CkpW6vJBXIvTayOwR1XWmSIIpp-A51zB";
  var permissions = [
    {
      type: "anyone",
      role: "reader",
    },
  ];
  async.eachSeries(
    permissions,
    function (permission, permissionCallback) {
      drive.permissions.create(
        {
          resource: permission,
          fileId: fileId,
          fields: "id",
        },
        function (err, res) {
          if (err) {
            // Handle error...
            console.error(err);
            permissionCallback(err);
          } else {
            console.log("Permission ID: ", res.id);
            permissionCallback();
          }
        }
      );
    },
    function (err) {
      if (err) {
        // Handle error
        console.error(err);
      } else {
        // All permissions inserted
        console.log("shared?");
      }
    }
  );

  return await drive.files
    .get({
      fileId: getDownloadFolderId,
      fields: "webViewLink",
    })
    .then((response) => {
      console.log(response.data.webViewLink);
    });
};

getFilesList();

// app.set('view engine', 'ejs')
