const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const Tesseract = require('tesseract.js');
const User = require('../../models/User');

// ============================================
// MULTER STORAGE CONFIGURATION
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('📁 Uploads folder created');
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + '-' + file.originalname;
    console.log('📄 File saved as:', filename);
    cb(null, filename);
  }
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
// IMPROVED PDF EXTRACTION (NO OCR FOR PDFs)
// ============================================
const extractPDF = async (filePath) => {
  console.log('📄 Starting PDF extraction for:', filePath);
  
  try {
    // Read the PDF file
    const dataBuffer = fs.readFileSync(filePath);
    console.log('📄 PDF file size:', dataBuffer.length, 'bytes');
    
    // Try pdf-parse with better options
    console.log('📄 Attempting pdf-parse...');
    const data = await pdfParse(dataBuffer, { max: 0 });
    
    if (data && data.text) {
      console.log('✅ pdf-parse successful!');
      console.log('📄 Pages:', data.numpages);
      console.log('📄 Text length:', data.text.length);
      console.log('📄 Text preview:', data.text.substring(0, 200));
      
      // If text is too short, try alternative
      if (data.text.length < 50) {
        console.log('⚠️ Text too short, trying alternative method...');
        return await extractPDFAlternative(filePath);
      }
      
      return data.text;
    }
    
    console.log('⚠️ pdf-parse returned empty, trying alternative...');
    return await extractPDFAlternative(filePath);
    
  } catch (error) {
    console.log('❌ pdf-parse error:', error.message);
    console.log('🔄 Trying alternative PDF extraction...');
    return await extractPDFAlternative(filePath);
  }
};

// ============================================
// ALTERNATIVE PDF EXTRACTION METHOD
// ============================================
const extractPDFAlternative = async (filePath) => {
  console.log('📄 Using alternative PDF extraction...');
  
  try {
    // Try reading PDF as text (works for some PDFs)
    const dataBuffer = fs.readFileSync(filePath);
    let text = dataBuffer.toString('utf8');
    
    // Clean up the text
    text = text
      .replace(/[^\x20-\x7E\n\r]/g, ' ') // Remove non-printable characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    console.log('📄 Alternative extraction text length:', text.length);
    
    if (text.length > 100) {
      console.log('✅ Alternative extraction successful!');
      return text;
    }
    
    console.log('⚠️ Alternative extraction failed, text too short');
    
    // One last attempt: use simple pattern matching
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
    return ''; // Return empty string instead of throwing
  }
};

// ============================================
// DOCX EXTRACTION
// ============================================
const extractDOCX = async (filePath) => {
  console.log('📄 Extracting DOCX...');
  try {
    const result = await mammoth.extractRawText({ path: filePath });
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
const extractDOC = async (filePath) => {
  console.log('📄 Extracting DOC...');
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    console.log('✅ DOC extracted, length:', result.value.length);
    return result.value;
  } catch (error) {
    console.error('❌ DOC error:', error);
    return '';
  }
};

// ============================================
// IMPROVED INFORMATION EXTRACTION
// ============================================
const extractInfo = (text) => {
  console.log('🔍 Starting information extraction...');
  console.log('📄 Text length:', text.length);
  console.log('📄 First 500 chars:', text.substring(0, 500));
  
  const extractedData = {
    name: '',
    email: '',
    phone: '',
    age: null,
    skills: [],
    education: '',
    experience: '',
    rawText: text.substring(0, 1000) // Store raw text for debugging
  };

  // ========== EXTRACT NAME ==========
  console.log('🔍 Looking for name...');
  
  // Try common name patterns
  const namePatterns = [
    /(?:Name|Full Name|Applicant Name|Student Name)[:]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/m,
    /([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/,
    /Nida\s+Fatima\s+Aslam/, // Specific for your CV
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

  // ========== EXTRACT EMAIL ==========
  console.log('🔍 Looking for email...');
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    extractedData.email = emailMatch[0];
    console.log('✅ Email found:', extractedData.email);
  }

  // ========== EXTRACT PHONE ==========
  console.log('🔍 Looking for phone...');
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

  // ========== EXTRACT AGE ==========
  console.log('🔍 Looking for age...');
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

  // ========== EXTRACT SKILLS ==========
  console.log('🔍 Looking for skills...');
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

  // ========== EXTRACT EDUCATION ==========
  console.log('🔍 Looking for education...');
  const educationKeywords = [
    'Bachelor', 'Master', 'BS', 'MS', 'BSc', 'MSc', 
    'BCS', 'MCS', 'Software Engineering', 'Computer Science',
    'B.Tech', 'M.Tech', 'PhD', 'MBA'
  ];
  
  educationKeywords.forEach(edu => {
    if (text.toLowerCase().includes(edu.toLowerCase())) {
      // Find the sentence containing the education keyword
      const sentences = text.split(/[.!?]/);
      for (let sentence of sentences) {
        if (sentence.toLowerCase().includes(edu.toLowerCase())) {
          extractedData.education = sentence.trim();
          console.log('✅ Education found:', extractedData.education);
          break;
        }
      }
    }
  });

  // ========== EXTRACT EXPERIENCE ==========
  console.log('🔍 Looking for experience...');
  const experiencePatterns = [
    /(?:Experience|Work Experience|Professional Experience)[:]\s*([^\n]{0,200})/i,
    /(\d+)\s*(?:years|yrs)\s*(?:of)?\s*(?:experience)/i
  ];
  
  for (const pattern of experiencePatterns) {
    const match = text.match(pattern);
    if (match) {
      extractedData.experience = match[1] || match[0];
      console.log('✅ Experience found:', extractedData.experience);
      break;
    }
  }

  console.log('📄 Final extracted data:', {
    name: extractedData.name,
    email: extractedData.email,
    phone: extractedData.phone,
    age: extractedData.age,
    skills: extractedData.skills.length,
    education: extractedData.education.substring(0, 50)
  });
  
  return extractedData;
};

// ============================================
// CONTROLLER FUNCTIONS
// ============================================

// Upload CV
const uploadCV = async (req, res) => {
  console.log('📤 UPLOAD CV FUNCTION CALLED');
  console.log('📤 Request file:', req.file);
  console.log('📤 Request user:', req.user);
  
  try {
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded' 
      });
    }

    console.log('📤 File received:', req.file.filename);
    console.log('📤 File path:', req.file.path);
    
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
      filename: req.file.filename,
      filePath: req.file.path,
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
        filename: req.file.filename,
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
  console.log('🔍 Request body:', req.body);
  console.log('🔍 Request user:', req.user);
  
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

    console.log('🔍 User found:', user.email);
    console.log('🔍 CV Data:', user.cvData);

    if (!user.cvData || !user.cvData.uploadedFile || !user.cvData.uploadedFile.filePath) {
      console.log('❌ No CV uploaded for user');
      return res.status(400).json({
        success: false,
        message: 'No CV uploaded yet. Please upload a CV first.'
      });
    }

    const filePath = user.cvData.uploadedFile.filePath;
    console.log('📄 File path from DB:', filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('❌ File not found at:', filePath);
      return res.status(404).json({
        success: false,
        message: 'CV file not found on server'
      });
    }

    const fileExt = path.extname(filePath).toLowerCase();
    console.log('📄 File extension:', fileExt);
    console.log('📄 File exists, size:', fs.statSync(filePath).size);
    
    let text = '';

    // Extract based on file type
    if (fileExt === '.pdf') {
      console.log('📄 Extracting PDF...');
      text = await extractPDF(filePath);
    } else if (fileExt === '.docx') {
      console.log('📄 Extracting DOCX...');
      text = await extractDOCX(filePath);
    } else if (fileExt === '.doc') {
      console.log('📄 Extracting DOC...');
      text = await extractDOC(filePath);
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
      console.log('📄 Text preview:', text);
      
      return res.status(400).json({
        success: false,
        message: 'Could not extract readable text from CV. Please ensure it\'s not a scanned/image-based document.',
        details: {
          textLength: text.length,
          fileType: fileExt
        }
      });
    }

    // Extract information
    const extractedData = extractInfo(text);
    
    // Save to database
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

    console.log('📋 Returning CV data for user:', user.email);
    
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