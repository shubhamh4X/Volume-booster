import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function bundleExtension() {
  const zip = new JSZip();
  const extensionDir = './extension';

  function addFolderToZip(dirPath, zipFolder) {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const subFolder = zipFolder.folder(item);
        addFolderToZip(fullPath, subFolder);
      } else {
        const content = fs.readFileSync(fullPath);
        zipFolder.file(item, content);
      }
    }
  }

  addFolderToZip(extensionDir, zip);

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync('volume-booster-extension.zip', buffer);
  fs.writeFileSync('./public/volume-booster-extension.zip', buffer);
  console.log('Successfully created volume-booster-extension.zip in root and public/');
}

bundleExtension().catch(err => {
  console.error(err);
  process.exit(1);
});
