const multer = require('multer');
const path = require('path');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const cloudinary = require('../../config/cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const User = require('../../models/User');
 
// ============================================
// MULTER STORAGE CONFIGURATION (CLOUDINARY)
// ============================================
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => {
    return {
      folder: 'cv-uploads',
      resource_type: 'raw', // required for pdf/doc/docx (non-image files)
      public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`,
    };
  },
});
 
// File Filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  console.log('📎 File type received:', file.mimetype);
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
// DOWNLOAD FILE FROM CLOUDINARY INTO A BUFFER
// ============================================
const downloadFromCloudinary = async (url) => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
};
 
// ============================================
// IMPROVED PDF EXTRACTION (NO OCR FOR PDFs)
// ============================================
const extractPDF = async (dataBuffer) => {
  console.log('📄 Starting PDF extraction, buffer size:', dataBuffer.length);
 
  try {
    console.log('📄 Attempting pdf-parse...');
    const data = await pdfParse(dataBuffer, { max: 0 });
 
    if (data && data.text) {
      console.log('✅ pdf-parse successful!');
      console.log('📄 Pages:', data.numpages);
      console.log('📄 Text length:', data.text.length);
 
      if (data.text.length < 50) {
        console.log('⚠️ Text too short, trying alternative method...');
        return await extractPDFAlternative(dataBuffer);
      }
 
      return data.text;
    }
 
    console.log('⚠️ pdf-parse returned empty, trying alternative...');
    return await extractPDFAlternative(dataBuffer);
 
  } catch (error) {
    console.log('❌ pdf-parse error:', error.message);
    console.log('🔄 Trying alternative PDF extraction...');
    return await extractPDFAlternative(dataBuffer);
  }
};
 
// ============================================
// ALTERNATIVE PDF EXTRACTION METHOD
// ============================================
const extractPDFAlternative = async (dataBuffer) => {
  console.log('📄 Using alternative PDF extraction...');
 
  try {
    let text = dataBuffer.toString('utf8');
 
    text = text
      .replace(/[^\x20-\x7E\n\r]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
 
    console.log('📄 Alternative extraction text length:', text.length);
 
    if (text.length > 100) {
      console.log('✅ Alternative extraction successful!');
      return text;
    }
 
    console.log('⚠️ Alternative extraction failed, text too short');
    console.log('📄 Attempting pattern-based extraction...');
 
    const patterns = {
      name: /(?:Name|Full Name|Applicant Name)[:]\s*([^\n]+)/i,
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
      phone: /(?:Phone|Mobile|Contact)[:]\s*([\d\+\-\(\)\s]{7,15})/i
    };
 
    let extracted = '';
    const textStr = dataBuffer.toString();
 
    if (patterns.name.test(textStr)) {
      const match = textStr.match(patterns.name);
      if (match) extracted += `Name: ${match[1]}\n`;
    }
 
    if (patterns.email.test(textStr)) {
      const match = textStr.match(patterns.email);
      if (match) extracted += `Email: ${match[0]}\n`;
    }
 
    if (patterns.phone.test(textStr)) {
      const match = textStr.match(patterns.phone);
      if (match) extracted += `Phone: ${match[1]}\n`;
    }
 
    if (extracted) {
      console.log('✅ Pattern extraction found data!');
      return extracted;
    }
 
    throw new Error('All PDF extraction methods failed');
 
  } catch (error) {
    console.error('❌ All extraction methods failed:', error.message);
    return '';
  }
};
 
// ============================================
// DOCX EXTRACTION
// ============================================
const extractDOCX = async (dataBuffer) => {
  console.log('📄 Extracting DOCX...');
  try {
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    console.log('✅ DOCX extracted, length:', result.value.length);
    return result.value;
  } catch (error) {
    console.error('❌ DOCX error:', error);
    return '';
  }
};
 
// ============================================
// DOC EXTRACTION
// ============================================
const extractDOC = async (dataBuffer) => {
  console.log('📄 Extracting DOC...');
  try {
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    console.log('✅ DOC extracted, length:', result.value.length);
    return result.value;
  } catch (error) {
    console.error('❌ DOC error:', error);
    return '';
  }
};

// ============================================
// SECTION-BASED PARSING (NEW)
// Finds ALL-CAPS resume section headers (SUMMARY, EDUCATION, SKILLS,
// EXPERIENCE, PROJECTS, etc.) inside the extracted text and slices the
// text between them, so "Education" only gets the Education section's
// content instead of the whole CV.
// ============================================
const SECTION_HEADER_PATTERN =
  /\b(SUMMARY|OBJECTIVE|PROFILE|EDUCATION|SKILLS|TECHNICAL SKILLS|EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT HISTORY|PROJECTS|CERTIFICATIONS|CERTIFICATES|LANGUAGES|CONTACT|CONTACT INFORMATION)\b/g;

const cleanSectionText = (raw) => {
  return raw
    .replace(/[◇•▪●○]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 400);
};

const extractSections = (text) => {
  const matches = [];
  let match;
  const regex = new RegExp(SECTION_HEADER_PATTERN);
  while ((match = regex.exec(text)) !== null) {
    matches.push({ name: match[1].toLowerCase(), index: match.index, length: match[0].length });
  }

  const sections = {};
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    const start = current.index + current.length;
    const end = next ? next.index : text.length;
    sections[current.name] = cleanSectionText(text.substring(start, end));
  }

  return sections;
};
 
// ============================================
// IMPROVED INFORMATION EXTRACTION
// ============================================
const extractInfo = (text) => {
  console.log('🔍 Starting information extraction...');
  console.log('📄 Text length:', text.length);
 
  const extractedData = {
    name: '',
    email: '',
    phone: '',
    age: null,
    skills: [],
    education: '',
    experience: '',
    rawText: text.substring(0, 1000)
  };

  const sections = extractSections(text);
  console.log('🔍 Detected sections:', Object.keys(sections));
 
  const namePatterns = [
    /(?:Name|Full Name|Applicant Name|Student Name)[:]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/m,
    /([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/,
    /[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+/
  ];
 
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      extractedData.name = match[1] || match[0];
      console.log('✅ Name found:', extractedData.name);
      break;
    }
  }
 
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    extractedData.email = emailMatch[0];
    console.log('✅ Email found:', extractedData.email);
  }
 
  const phonePatterns = [
    /03[0-9]{2}[-.]?[0-9]{7}/,
    /\+92[0-9]{10}/,
    /0[3-9][0-9]{2}[-.]?[0-9]{7}/,
    /\(\d{3}\)\s?\d{3}-\d{4}/
  ];
 
  for (const pattern of phonePatterns) {
    const match = text.match(pattern);
    if (match) {
      extractedData.phone = match[0];
      console.log('✅ Phone found:', extractedData.phone);
      break;
    }
  }
 
  const agePatterns = [
    /Age[:]\s*(\d{1,2})/i,
    /(\d{1,2})\s*(?:years|yrs|year)/i,
    /born\s+(\d{1,2})/i
  ];
 
  for (const pattern of agePatterns) {
    const match = text.match(pattern);
    if (match) {
      extractedData.age = parseInt(match[1]);
      console.log('✅ Age found:', extractedData.age);
      break;
    }
  }
 
  const skillKeywords = [
    'JavaScript', 'Python', 'React', 'Node', 'Express', 'MongoDB',
    'SQL', 'HTML', 'CSS', 'Java', 'C++', 'PHP', 'TypeScript',
    'Angular', 'Vue', 'Django', 'Flask', 'Spring', 'AWS', 'Azure',
    'Git', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD'
  ];
 
  const foundSkills = [];
  skillKeywords.forEach(skill => {
    if (text.toLowerCase().includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  });
 
  if (foundSkills.length > 0) {
    extractedData.skills = foundSkills;
    console.log('✅ Skills found:', foundSkills.join(', '));
  }

  // ---- EDUCATION: prefer the actual EDUCATION section ----
  if (sections['education']) {
    extractedData.education = sections['education'];
    console.log('✅ Education found (section-based):', extractedData.education);
  } else {
    const educationKeywords = [
      'Bachelor', 'Master', 'BS', 'MS', 'BSc', 'MSc',
      'BCS', 'MCS', 'Software Engineering', 'Computer Science',
      'B.Tech', 'M.Tech', 'PhD', 'MBA'
    ];

    educationKeywords.forEach(edu => {
      if (text.toLowerCase().includes(edu.toLowerCase())) {
        const sentences = text.split(/[.!?]/);
        for (let sentence of sentences) {
          if (sentence.toLowerCase().includes(edu.toLowerCase())) {
            extractedData.education = sentence.trim();
            console.log('✅ Education found (fallback):', extractedData.education);
            break;
          }
        }
      }
    });
  }

  // ---- EXPERIENCE: prefer the actual EXPERIENCE section ----
  const experienceSection =
    sections['work experience'] ||
    sections['experience'] ||
    sections['professional experience'] ||
    sections['employment history'];

  if (experienceSection) {
    extractedData.experience = experienceSection;
    console.log('✅ Experience found (section-based):', extractedData.experience);
  } else {
    const experiencePatterns = [
      /(?:Experience|Work Experience|Professional Experience)[:]\s*([^\n]{0,200})/i,
      /(\d+)\s*(?:years|yrs)\s*(?:of)?\s*(?:experience)/i
    ];

    for (const pattern of experiencePatterns) {
      const match = text.match(pattern);
      if (match) {
        extractedData.experience = match[1] || match[0];
        console.log('✅ Experience found (fallback):', extractedData.experience);
        break;
      }
    }
  }
 
  return extractedData;
};
 
// ============================================
// CONTROLLER FUNCTIONS
// ============================================
 
// Upload CV
const uploadCV = async (req, res) => {
  console.log('📤 UPLOAD CV FUNCTION CALLED');
 
  try {
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
 
    console.log('📤 File uploaded to Cloudinary:', req.file.path);
 
    const userId = req.user._id;
    const user = await User.findById(userId);
 
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
 
    user.cvData = user.cvData || {};
    user.cvData.uploadedFile = {
      filename: req.file.originalname,     // e.g. "resume.pdf"
      filePath: req.file.path,             // Cloudinary secure URL
      cloudinaryId: req.file.filename,     // public_id, useful if you delete later
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      uploadDate: new Date()
    };
 
    await user.save();
    console.log('✅ CV saved for user:', userId);
 
    res.status(200).json({
      success: true,
      message: 'CV uploaded successfully',
      file: {
        filename: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        type: req.file.mimetype
      }
    });
 
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Upload failed: ' + error.message
    });
  }
};
 
// Extract CV Data
const extractCVData = async (req, res) => {
  console.log('🔍 EXTRACT CV DATA FUNCTION CALLED');
 
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
 
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
 
    if (!user.cvData || !user.cvData.uploadedFile || !user.cvData.uploadedFile.filePath) {
      console.log('❌ No CV uploaded for user');
      return res.status(400).json({
        success: false,
        message: 'No CV uploaded yet. Please upload a CV first.'
      });
    }
 
    const cloudinaryUrl = user.cvData.uploadedFile.filePath;
    const originalFilename = user.cvData.uploadedFile.filename;
    console.log('📄 Downloading from Cloudinary:', cloudinaryUrl);
 
    let dataBuffer;
    try {
      dataBuffer = await downloadFromCloudinary(cloudinaryUrl);
    } catch (err) {
      console.log('❌ Could not download file from Cloudinary:', err.message);
      return res.status(404).json({
        success: false,
        message: 'CV file not found on Cloudinary'
      });
    }
 
    const fileExt = path.extname(originalFilename).toLowerCase();
    console.log('📄 File extension:', fileExt, '| buffer size:', dataBuffer.length);
 
    let text = '';
 
    if (fileExt === '.pdf') {
      text = await extractPDF(dataBuffer);
    } else if (fileExt === '.docx') {
      text = await extractDOCX(dataBuffer);
    } else if (fileExt === '.doc') {
      text = await extractDOC(dataBuffer);
    } else {
      console.log('❌ Unsupported file type:', fileExt);
      return res.status(400).json({
        success: false,
        message: `Unsupported file format: ${fileExt}`
      });
    }
 
    console.log('📄 Total text length extracted:', text.length);
 
    if (text.length < 10) {
      console.log('⚠️ Text extraction returned very little content');
      return res.status(400).json({
        success: false,
        message: 'Could not extract readable text from CV. Please ensure it\'s not a scanned/image-based document.',
        details: {
          textLength: text.length,
          fileType: fileExt
        }
      });
    }
 
    const extractedData = extractInfo(text);
 
    user.cvData.extractedInfo = extractedData;
    await user.save();
    console.log('✅ CV data saved to database');
 
    res.status(200).json({
      success: true,
      message: 'CV data extracted successfully',
      data: extractedData,
      debug: {
        textLength: text.length,
        fileType: fileExt,
        textPreview: text.substring(0, 200)
      }
    });
 
  } catch (error) {
    console.error('❌ Extraction error:', error);
    res.status(500).json({
      success: false,
      message: 'Extraction failed: ' + error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
 
// Get CV Data
const getCVData = async (req, res) => {
  console.log('📋 GET CV DATA FUNCTION CALLED');
 
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
 
    if (!user) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
 
    res.status(200).json({
      success: true,
      data: {
        extractedInfo: user.cvData?.extractedInfo || {},
        uploadedFile: user.cvData?.uploadedFile || {}
      }
    });
 
  } catch (error) {
    console.error('❌ Get CV error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get CV data: ' + error.message
    });
  }
};
 
// ============================================
// EXPORTS
// ============================================
module.exports = {
  upload,
  uploadCV,
  extractCVData,
  getCVData
};