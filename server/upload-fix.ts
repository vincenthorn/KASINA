import { Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { upsertUser } from './db.js';

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

export async function handleCsvUpload(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No CSV file uploaded" });
    }

    const userType = (req.body.userType as 'freemium' | 'premium' | 'admin') || 'freemium';
    console.log(`Processing CSV upload for user type: ${userType}`);

    // Parse CSV data
    const records = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (!records || records.length === 0) {
      throw new Error("No data found in the CSV file");
    }

    console.log(`Found ${records.length} records in CSV`);
    console.log('First record:', records[0]);

    // Find email column - checking for "Email" column specifically from your CSV
    const firstRecord = records[0];
    let emailColumnName = 'Email'; // Your CSV uses "Email" column

    if (!firstRecord[emailColumnName]) {
      // Fallback to other possible column names
      const possibleEmailColumns = [
        "email", "EmailAddress", "Email Address", 
        "email_address", "e-mail", "User Email"
      ];
      
      for (const colName of possibleEmailColumns) {
        if (firstRecord[colName] !== undefined) {
          emailColumnName = colName;
          break;
        }
      }
    }

    if (!firstRecord[emailColumnName]) {
      console.error('Available columns:', Object.keys(firstRecord));
      throw new Error("No email column found in CSV file");
    }

    console.log(`Using email column: ${emailColumnName}`);

    // Process each record and add to database
    let processedCount = 0;
    let errorCount = 0;

    for (const record of records) {
      try {
        const email = record[emailColumnName]?.trim();
        if (email && email.includes('@')) {
          const name = record['Name'] || record['name'] || null;
          
          console.log(`Processing user: ${email} - ${name}`);
          
          // Add user to database
          const result = await upsertUser(email, name?.trim() || null, userType);
          if (result) {
            processedCount++;
            console.log(`✅ Added user: ${email}`);
          } else {
            errorCount++;
            console.log(`❌ Failed to add user: ${email}`);
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`Error processing record:`, error);
      }
    }

    console.log(`Upload complete: ${processedCount} users added, ${errorCount} errors`);

    return res.status(200).json({ 
      message: `${userType.charAt(0).toUpperCase() + userType.slice(1)} whitelist updated successfully`, 
      count: processedCount,
      errors: errorCount,
      userType
    });

  } catch (error) {
    console.error("Error processing whitelist upload:", error);
    return res.status(500).json({ 
      message: "Failed to process the uploaded CSV file",
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}

export const uploadMiddleware = upload.single("csv");