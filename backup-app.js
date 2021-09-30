const express = require("express");
var app = express();

const { google } = require("googleapis");
const keys = require("./drive-key.json");

const path = require("path");
const fs = require("fs");
const async = require("async");

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
// for image upload data from Frontend

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
            // console.log("Resolving: " + mainTemplateFilesID);
            resolve("duplicate file step: " + mainTemplatefilesName);
            console.log("One file is copied: " + data);
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
              fileIdtoCopy.push(file.id);
              resolve("SUCCESS: move file step 1");
            }
          }
        } else {
          reject("FAILED: move file step");
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
                          return;
                        } else {
                          console.log(
                            "One file moved successfully: " + file.data.id
                          );

                          setTimeout(() => {
                            renameFileinNewFolder(folderId);
                          }, 1000);
                        }
                      }
                    );
                  }, 1000);
                }
              }
            );
          }
        }
      });
    }
  );
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

setPermissionGetDownloadLink();

// app.set('view engine', 'ejs')
