const express = require("express");
var app = express();

const { google } = require("googleapis");
const keys = require("./drive-key.json");

const path = require("path");
const fs = require("fs");

const jwToken = new google.auth.JWT(
  keys.client_email,
  null,
  keys.private_key,
  ["https://www.googleapis.com/auth/drive"],
  null
);

/// global setting ////

let topParentFolderId = "1PyNq5_KrhH9muhS5xnDwfkki-xY_EqNf";
let mainTemplateFolderVIB320480 = "1uFcMQCtbOg02wnn5IibmMWxDfcBjNXQZ";
let totalFilesinMainTemplate = 0;
let copiedFiles = 0;

/// END of global setting ////

/////********** Component STEP BY STEP  **********////////

// 1.getFilesList
// 2.duplicateFiles
// 3.createNewfolder
// 4.moveCopiedFilestoNewFolder
// 5.renameFileinNewFolder
// 6.downloadNewFolder (shre folder and generate link)

/////********** END **********////////

jwToken.authorize((authErr) => {
  if (authErr) {
    console.log("can't get anything_ " + authErr);
    return;
  } else {
    console.log("authoriation ok");
  }
});

const drive = google.drive({ version: "v3", auth: jwToken });

/***********  need a create folder function ************/

const checkFilesExisting = () => {
  parents = folderToCheck;

  drive.files.list(
    {
      pageSize: 10,
      q: "'" + parents + "' in parents and trashed=false",
      fields: "files(id, name)",
    },
    (err, { data }) => {
      if (err) return console.log("check file error: " + err);

      //check for duplicate files existing
      console.log("check exsting file: " + data.files);
      // callback();
    }
  );
};

const getFilesList = (newFolderID) => {
  const parents = mainTemplateFolderVIB320480;
  const promises = [];

  drive.files.list(
    {
      q: "'" + parents + "' in parents and trashed=false",
      fields: "files(id, name)",
    },
    (err, { data }) => {
      if (err) return console.log("The API returned an error: " + err);

      const files = data.files;

      if (files.length) {
        for (const file of files) {
          promises.push(duplicateFiles(file.id, file.name));
        }
      } else {
        console.log("no file to copy");
      }

      Promise.all(promises)
        .then((results) => {
          console.log("All done", results);

          setTimeout(() => {
            moveCopiedFilestoNewFolder(newFolderID);
            // for (const file of files) {
            //   moveCopiedFilestoNewFolder(file.id, file.name, newFolderID);
            // }
          }, 2000);
        })
        .catch((e) => {
          console.log("Catch error: ", results);
        });
    }
  );
};

const duplicateFiles = (mainTemplateFilesID, mainTemplatefilesName) => {
  // console.log("Error: move files failed due to no duplicated files found.")
  return new Promise((resolve) => {
    setTimeout(() => {
      drive.files.copy(
        {
          fileId: mainTemplateFilesID,
          resource: { name: "copy_" + mainTemplatefilesName },
        },
        (err, data) => {
          if (err) {
            console.log(err);
            // res.send("error");
            return;
          } else {
            console.log("Resolving: " + mainTemplateFilesID);
            resolve(mainTemplateFilesID);
            console.log("One file is copied: " + data);
          }
        }
      );
    }, Math.floor(Math.random() * 1000));
  });
};

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

const moveCopiedFilestoNewFolder = (copyToFolderID) => {
  const folderId = copyToFolderID; // new folder ID
  console.log(folderId);
  // return;
  let fileIdtoCopy = [];

  drive.files.list(
    {
      q: "'" + mainTemplateFolderVIB320480 + "' in parents and trashed=false",
      fields: "files(id, name)",
    },
    (err, { data }) => {
      if (err) return console.log("The MOVE API returned an error: " + err);

      return new Promise((resolve, reject) => {
        if (data.files.length) {
          for (const file of data.files) {
            if (file.name.indexOf("copy_") > -1) {
              // console.log(file.name + ":" + file.id);
              fileIdtoCopy.push(file.id);
              resolve("SUCCESS: move file step 1");
            }
          }
        } else {
          reject("FAILED: move file step 1");
        }
      }).then(() => {
        if (fileIdtoCopy.length) {
          for (const idCopy of fileIdtoCopy) {
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
                  setTimeout(() => {
                    drive.files.update(
                      {
                        fileId: idCopy,
                        addParents: folderId,
                        removeParents: previousParents,
                        fields: "id, parents",
                      },
                      function (err, file) {
                        if (err) {
                          console.log("Move file error: " + err);
                        } else {
                          console.log(
                            "One file moved successfully",
                            file.data.id
                          );
                          // renameFileinNewFolder(duplicatedFilesID, duplicatedFilesName)
                        }
                      }
                    );
                  }, 5000);
                }
              }
            );
          }
        }
      });
    }
  );
};

const renameFileinNewFolder = (fileID, fileName) => {
  drive.files.update(
    {
      fileId: fileID,
      resource: { name: fileName },
    },
    (err, res) => {
      if (err) return console.log("The API returned an error: " + err);
      else {
        console.log(
          "The name of the file has been updated with file id: " + fileID
        );
      }
    }
  );
};

const downloadNewFolder = () => {
  var downloadDest = fs.createWriteStream("./file/"); // Please set the filename of the saved file.

  drive.files.get(
    {
      fileId: "1uFcMQCtbOg02wnn5IibmMWxDfcBjNXQZ",
      mimeType: "application/vnd.google-apps.folder",
    },
    {
      responseType: "stream",
    },
    (err, { data }) => {
      if (err) {
        console.log("response error for download file get: " + err);
        return;
      } else {
        data
          .on("end", () => {
            console.log("Download stream Done.");
          })
          .on("error", (err) => {
            console.log("response error for download DATA: " + err);
            return process.exit();
          })
          .pipe(downloadDest);
      }
    }
  );
};

createNewfolder();

// app.set('view engine', 'ejs')
