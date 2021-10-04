const express = require("express");
var app = express();

// const { google } = require("googleapis");
const { drive } = require("./gAuth");

const fs = require("fs");
const async = require("async");

const { listFile } = require("./components/getListComponent");
/// global setting ////

let topParentFolderId = "1PyNq5_KrhH9muhS5xnDwfkki-xY_EqNf"; // DO NOT CHANGE: folder ID generator folder on g drive
let mainTemplateFolder = "1uFcMQCtbOg02wnn5IibmMWxDfcBjNXQZ"; // folder ID of the template. EG VIB 320480

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
const createNewfolder = (res) => {
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
        // res.send({
        //   status: 500,
        //   message: "New folder creation failed.",
        // });
      } else {
        // console.log(file.data.id); // new folder ID
        console.log("new folder is created");
        getFilesList(file.data.id);
        // res.send({
        //   status: 200,
        //   message: "New folder created",
        // });
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
  const parents = mainTemplateFolder;
  const copyfilePromises = [];

  listFile(parents, (x) => {
    if (x.length) {
      for (const file of x) {
        copyfilePromises.push(duplicateFiles(file.id, file.name));
      }
      Promise.all(copyfilePromises)
        .then((results) => {
          // console.log("All done", results);
          // do check copied file here
          checkFileToMove(newFolderID);
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

const checkFileToMove = (copyToFolderID) => {
  let fileIdtoCopy = [];

  listFile(mainTemplateFolder, (x) => {
    if (x.length) {
      new Promise((resolve, reject) => {
        for (const file of x) {
          if (file.name.indexOf("copy_") > -1) {
            fileIdtoCopy.push(file.id); // check how many file need to be moved
            resolve("checked file:", file.id);
          } else {
            reject("No copied file found.");
          }
        }
      });

      Promise.all(fileIdtoCopy)
        .then((results) => {
          console.log("All done", results);
          // do move file here
          setTimeout(() => {
            moveCopiedFilestoNewFolder(copyToFolderID, fileIdtoCopy);
          }, 2000);
        })
        .catch((results) => {
          console.log("Catch error: ", results);
        });
    } else {
      res.send({
        status: 404,
        message: "No files to move.",
      });
    }
  });
};

const moveCopiedFilestoNewFolder = (folderid, filesID) => {
  let movedFileId = [];

  if (filesID.length) {
    // console.log(filesID);
    for (const idCopy of filesID) {
      drive.files.get(
        {
          fileId: idCopy,
          fields: "parents",
        },
        function (err, file) {
          if (err) {
            // Handle error
            console.error(err);
          } else {
            let previousParents = file.data.parents.join(",");

            drive.files.update(
              {
                fileId: idCopy,
                addParents: folderid,
                removeParents: previousParents,
                fields: "id, parents",
              },
              function (err, file) {
                new Promise((resolve, reject) => {
                  if (err) {
                    reject("Move file error: " + err);
                  } else {
                    movedFileId.push(file.data.id);
                    resolve("One file moved successfully: " + file.data.id);
                  }
                });
                Promise.all(movedFileId)
                  .then((results) => {
                    console.log("Moved done", results);
                    // do rename file here
                    // renameFileinNewFolder(folderid);
                  })
                  .catch((results) => {
                    console.log("Catch error: ", results);
                  });
              }
            );
          }
        }
      );
    }
  }
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

createNewfolder();

// app.set('view engine', 'ejs')
