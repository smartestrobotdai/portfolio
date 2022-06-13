
import { ShareDirectoryClient, ShareServiceClient, StorageSharedKeyCredential } from "@azure/storage-file-share"
import path from 'path'

const account = "stock2891481932";
const accountKey = "+6/5XbpebnNnt7YtNkEmv7A4FVGMmBiCSuLJkpiQ3Zbnux9dKJpUUQ2Rqfyx7l2cJ0bIQBNi/Z6XNgR7j6E2ZA==";

const credential = new StorageSharedKeyCredential(account, accountKey);
const serviceClient = new ShareServiceClient(
  `https://${account}.file.core.windows.net`,
  credential
)

const shareName = "azureml-filestore-89d50b3e-5042-465b-ad9c-b877c7e61b48";
const directoryName = "data";

const directoryClient = serviceClient.getShareClient(shareName).getDirectoryClient(directoryName);

// async function createAzureDir(dir: string) {
//   const dirs = dir.split('/')
//   let curPath = ''
//   for (let d of dirs) {
//     console.log(d)
//     curPath = curPath ? d : path.join(curPath, d)
//     console.log(`Creating path: ${curPath}`)
//     const subDirectoryClient = directoryClient.getDirectoryClient(curPath)
//     await subDirectoryClient.createIfNotExists()
//   } 
// }

export function createAzureDir(dir: string, subDirectoryClient: ShareDirectoryClient = directoryClient): Promise<any> {
  if (!dir) {
    return Promise.resolve()
  }

  const dirs = dir.split('/')
  const curDir = dirs[0]
  const leftDir = dirs.slice(1).join('/')
  subDirectoryClient = subDirectoryClient.getDirectoryClient(curDir)
  return subDirectoryClient.createIfNotExists()
    .then((response) => {
      if (response.succeeded) {
        console.log(`Directory: ${path.join(subDirectoryClient.path, curDir)} Created`)
      }
      
      return createAzureDir(leftDir, subDirectoryClient)
    })
    .catch(e => console.error)
}

function getSubDirectoryClient(dir: string) {
  const dirs = dir.split('/')
  let subDirectoryClient = directoryClient
  for (const d of dirs) {
    subDirectoryClient = subDirectoryClient.getDirectoryClient(d)
  }
  return subDirectoryClient
}

export function createAzureFile(dir: string, filename: string, content: string) {
  const subDirectoryClient = getSubDirectoryClient(dir)
  const fileClient = subDirectoryClient.getFileClient(filename)
  return fileClient.create(content.length)
    .then(() => fileClient.uploadRange(content, 0 , content.length))
    .then(() => {console.log(`File: ${path.join(dir, filename)} created`)})
    .catch(e => console.error)
}

createAzureDir('test/test1').then(() => 
  createAzureFile('test/test1', 'mytest', 'hello world1')
)

// const shareName = "azureml-filestore-89d50b3e-5042-465b-ad9c-b877c7e61b48";
// const directoryName = "stock";

// async function main() {
//   const directoryClient = serviceClient.getShareClient(shareName).getDirectoryClient(directoryName);

//   const content = "Hello World!";
//   const fileName = "newfile" + new Date().getTime();
//   const fileClient = directoryClient.getFileClient(fileName);
//   await fileClient.create(content.length);
//   console.log(`Create file ${fileName} successfully`);

//   // Upload file range
//   await fileClient.uploadRange(content, 0, content.length)
//   console.log(`Upload file range "${content}" to ${fileName} successfully`);
// }

// main();

// const shareName = "<share name>";
// const directoryName = "<directory name>";

// async function main() {
//   const directoryClient = serviceClient.getShareClient(shareName).getDirectoryClient(directoryName);

//   const content = "Hello World!";
//   const fileName = "newfile" + new Date().getTime();
//   const fileClient = directoryClient.getFileClient(fileName);
//   await fileClient.create(content.length);
//   console.log(`Create file ${fileName} successfully`);

//   // Upload file range
//   await fileClient.uploadRange(content, 0, content.length);
//   console.log(`Upload file range "${content}" to ${fileName} successfully`);
// }

// main();