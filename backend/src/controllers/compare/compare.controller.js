const multer = require('multer');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { diffWords } = require('diff');

// ============================================
// MULTER — IN-MEMORY ONLY (no Cloudinary needed,
// these files are only used for a one-time comparison,
// never saved anywhere)
// ============================================
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ============================================
// TEXT EXTRACTION HELPERS
// (duplicated from cv.controller.js on purpose, to avoid
// touching that working file at all)
// ============================================
const extractPDF = async (dataBuffer) => {
  try {
    const data = await pdfParse(dataBuffer, { max: 0 });
    if (data && data.text && data.text.length > 20) {
      return data.text;
    }
    return dataBuffer.toString('utf8').replace(/[^\x20-\x7E\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
  } catch (error) {
    console.error('❌ PDF extraction error:', error.message);
    return '';
  }
};

const extractDOCX = async (dataBuffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    return result.value;
  } catch (error) {
    console.error('❌ DOCX extraction error:', error.message);
    return '';
  }
};

const extractTextFromFile = async (file) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.pdf') return await extractPDF(file.buffer);
  if (ext === '.docx' || ext === '.doc') return await extractDOCX(file.buffer);
  return '';
};

// ============================================
// COMPARE TWO DOCUMENTS
// ============================================
const compareDocuments = async (req, res) => {
  try {
    if (!req.files || !req.files.fileOne || !req.files.fileTwo) {
      return res.status(400).json({
        success: false,
        message: 'Please upload two documents to compare'
      });
    }

    const fileOne = req.files.fileOne[0];
    const fileTwo = req.files.fileTwo[0];

    const textOne = await extractTextFromFile(fileOne);
    const textTwo = await extractTextFromFile(fileTwo);

    if (!textOne || !textTwo) {
      return res.status(400).json({
        success: false,
        message: 'Could not extract readable text from one or both files'
      });
    }

    const parts = diffWords(textOne, textTwo);

    res.status(200).json({
      success: true,
      fileNames: {
        fileOne: fileOne.originalname,
        fileTwo: fileTwo.originalname
      },
      diff: parts
    });

  } catch (error) {
    console.error('❌ Compare error:', error);
    res.status(500).json({
      success: false,
      message: 'Comparison failed: ' + error.message
    });
  }
};

module.exports = { upload, compareDocuments };