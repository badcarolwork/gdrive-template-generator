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

const checkFilesExisting = (folderToCheck) =>{
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
      console.log("check exsting file: " + data.files)
      // callback();
    }
  )

}

const getFilesList = async () => {
  const parents = mainTemplateFolderVIB320480;
  await drive.files.list(
    {
      q: "'" + parents + "' in parents and trashed=false",
      fields: "files(id, name)", 
    },
    (err, { data }) => {
      if (err) return console.log("The API returned an error: " + err);

      const files = data.files;
        if (files.length) {
          for (const file of files) {
            duplicateFiles(file.id, file.name);
          }
          console.log("done")       

        // files.forEach((file) => {
        //     duplicateFiles(file.id, file.name);
          
          
        //   // if(copiedFiles === totalFilesinMainTemplate){
        //   //   moveCopiedFilestoNewFolder(file.id, file.name, newFolderID)
        //   // } 

        // });
        // console.log("done nou")
        

      } else {
        console.log("No files found.");
      }
    }
  );
};


const duplicateFiles = (mainTemplateFilesID, mainTemplatefilesName) => {
    // console.log("Error: move files failed due to no duplicated files found.")
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
          console.log("One file is copied: "+ data);          
        }
      }
    );
   
}

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

const moveCopiedFilestoNewFolder = (duplicatedFilesID, duplicatedFilesName, copyToFolderID) => {
  const fileId = duplicatedFilesID; 
  const folderId = copyToFolderID; // new folder ID
  
  drive.files.get({
    fileId: fileId,
    fields: 'parents'
  }, function (err, file) {
    if (err) {
      // Handle error
      console.error(err);
    } else {
      if(duplicatedFilesName.indexOf("copy_") > -1){

          console.log(duplicatedFilesName + " : " + duplicatedFilesID)

          let previousParents = file.data.parents.join(',');
          drive.files.update({
            fileId: fileId,
            addParents: folderId,
            removeParents: previousParents,
            fields: 'id, parents'
          }, function (err, file) {
            if (err) {
              console.log("Move file error: "+ err)
            } else {
              console.log("One file moved successfully")
              // renameFileinNewFolder(duplicatedFilesID, duplicatedFilesName)
            }
          });

      } else {
        console.log("no duplicated files to move.");
        return;
      }
      
    }
  });
        
};

const renameFileinNewFolder = (fileID,fileName) =>{
  drive.files.update({
    fileId: fileID,
    resource: {'name': fileName},
  }, (err, res) => {

    if (err) return console.log('The API returned an error: ' + err);
    else {
      console.log('The name of the file has been updated with file id: '+ fileID);
    }
  });
}

const downloadNewFolder = () => {

  var downloadDest = fs.createWriteStream("./file/"); // Please set the filename of the saved file.

  drive.files.get(
    { 
      fileId: "1uFcMQCtbOg02wnn5IibmMWxDfcBjNXQZ", 
      mimeType: "application/vnd.google-apps.folder" 
    },
    { 
      responseType: "stream" 
    },
    (err, { data }) => {
      if (err) {
        console.log("response error for download file get: "+ err);
        return;
      }else{
        data
        .on("end", () => {
          console.log("Download stream Done.")
        })
        .on("error", (err) => {
          console.log("response error for download DATA: "+ err);
          return process.exit();
        })
        .pipe(downloadDest);
      }  
    }
  );
};

getFilesList()

// app.set('view engine', 'ejs')
