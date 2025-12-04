const nodemailer = require('nodemailer');

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helpers
const formatDueDate = (bill) => new Date(bill.dueDate)
    .toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

const formatCurrency = (amount) => typeof amount === 'number'
    ? amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null;

const formatRecurrence = (bill) => {
    if (!bill?.isRecurring || !bill?.frequency || bill.frequency === 'none') return '';

    const frequencyMap = {
        monthly: 'รายเดือน',
        yearly: 'รายปี',
        weekly: 'รายสัปดาห์'
    };

    const label = frequencyMap[bill.frequency] || bill.frequency;
    if (bill.frequency === 'monthly' && bill.recurrenceDate) {
        return `${label} (ทุกวันที่ ${bill.recurrenceDate})`;
    }

    return label;
};

const buildBillDetailsHtml = (bill, dueDate) => {
    const currency = formatCurrency(bill.amount);
    const recurrence = formatRecurrence(bill);

    return `
        <p style="margin: 10px 0;"><strong>รายการ:</strong> ${bill.title}</p>
        ${currency !== null ? `<p style="margin: 10px 0;"><strong>จำนวนเงิน:</strong> ฿${currency}</p>` : ''}
        <p style="margin: 10px 0;"><strong>วันครบกำหนด:</strong> ${dueDate}</p>
        ${bill.category ? `<p style="margin: 10px 0;"><strong>หมวดหมู่:</strong> ${bill.category}</p>` : ''}
        ${recurrence ? `<p style="margin: 10px 0;"><strong>รอบบิล:</strong> ${recurrence}</p>` : ''}
    `;
};

// Create transporter for Gmail (using app password)
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
};

// Send OTP email
const sendOTPEmail = async (email, username, otp) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'ยืนยันอีเมลของคุณ - The Family Bank',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0;">The Family Bank</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #333; margin-top: 0;">สวัสดี ${username}!</h2>
                    
                    <p style="color: #555; line-height: 1.6;">
                        ยินดีต้อนรับสู่ The Family Bank! 🎉
                    </p>
                    
                    <p style="color: #555; line-height: 1.6;">
                        กรุณาใช้รหัส OTP ด้านล่างเพื่อยืนยันอีเมลของคุณ:
                    </p>
                    
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
                        <h1 style="color: #667eea; font-size: 36px; letter-spacing: 8px; margin: 0;">${otp}</h1>
                    </div>
                    
                    <p style="color: #999; font-size: 14px; line-height: 1.6;">
                        ⏱️ รหัสนี้จะหมดอายุใน <strong>10 นาที</strong>
                    </p>
                    
                    <p style="color: #999; font-size: 14px; line-height: 1.6;">
                        หากคุณไม่ได้ลงทะเบียน กรุณาเพิกเฉยต่ออีเมลนี้
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                        ขอบคุณที่ใช้บริการ The Family Bank<br>
                        ระบบจัดการการเงินครอบครัวของคุณ
                    </p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`OTP email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending OTP email:', error);
        throw new Error('Failed to send OTP email');
    }
};

// Send Bill Created Email
const sendBillCreatedEmail = async (email, username, bill) => {
    const transporter = createTransporter();
    const dueDate = formatDueDate(bill);

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `สร้างบิลใหม่: ${bill.title} - The Family Bank`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
                <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0;">บิลใหม่ถูกสร้างแล้ว</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #333; margin-top: 0;">สวัสดี ${username}</h2>
                    
                    <p style="color: #555; line-height: 1.6;">
                        คุณได้สร้างบิลใหม่เรียบร้อยแล้ว รายละเอียดดังนี้:
                    </p>
                    
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        ${buildBillDetailsHtml(bill, dueDate)}
                    </div>
                    
                    <p style="color: #555; line-height: 1.6;">
                        เราจะแจ้งเตือนคุณอีกครั้ง 3 ชั่วโมงก่อนถึงกำหนดชำระ
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                        The Family Bank
                    </p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Bill created email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending bill created email:', error);
        // Don't throw error to prevent blocking bill creation
    }
};

// Send Bill Reminder Email
const sendBillReminderEmail = async (email, username, bill) => {
    const transporter = createTransporter();
    const dueDate = formatDueDate(bill);

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: `🔔 แจ้งเตือนใกล้ถึงกำหนด: ${bill.title} - The Family Bank`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
                <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0;">แจ้งเตือนบิลใกล้ถึงกำหนด</h1>
                </div>
                
                <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px;">
                    <h2 style="color: #333; margin-top: 0;">สวัสดี ${username}</h2>
                    
                    <p style="color: #555; line-height: 1.6;">
                        บิล <strong>${bill.title}</strong> จะครบกำหนดชำระในอีก 3 ชั่วโมง
                    </p>
                    
                    <div style="background-color: #fffbeb; border: 1px solid #fcd34d; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        ${buildBillDetailsHtml(bill, dueDate)}
                    </div>
                    
                    <p style="color: #555; line-height: 1.6;">
                        อย่าลืมชำระเงินให้ตรงเวลานะครับ!
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    
                    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                        The Family Bank
                    </p>
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Bill reminder email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending bill reminder email:', error);
    }
};

module.exports = {
    generateOTP,
    sendOTPEmail,
    sendBillCreatedEmail,
    sendBillReminderEmail
};
