const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    // Set SendGrid API key
    this.apiKey = process.env.SENDGRID_API_KEY || 'SG.your-api-key-here';
    sgMail.setApiKey(this.apiKey);
    
    // Default from email
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@easybuy.com';
    this.fromName = process.env.FROM_NAME || 'EasyBuy';
  }

  async sendOTPEmail(toEmail, otp, userName = '') {
    try {
      const msg = {
        to: toEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: 'Mã OTP đặt lại mật khẩu - EasyBuy',
        html: this.generateOTPEmailTemplate(otp, userName),
        text: `Mã OTP của bạn là: ${otp}. Mã này có hiệu lực trong 5 phút.`
      };

      const result = await sgMail.send(msg);
      console.log(`📧 Email sent successfully to ${toEmail}`);
      return { success: true, messageId: result[0].headers['x-message-id'] };
      
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  generateOTPEmailTemplate(otp, userName) {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mã OTP - EasyBuy</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .email-container {
                background: white;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #667eea;
                margin-bottom: 10px;
            }
            .title {
                font-size: 24px;
                color: #333;
                margin-bottom: 20px;
            }
            .otp-container {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                margin: 20px 0;
            }
            .otp-code {
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 5px;
                margin: 10px 0;
            }
            .warning {
                background: #fff3cd;
                border: 1px solid #ffeaa7;
                color: #856404;
                padding: 15px;
                border-radius: 5px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
                color: #666;
                font-size: 14px;
            }
            .button {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 5px;
                margin: 10px 0;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <div class="logo">🛒 EasyBuy</div>
                <h1 class="title">Mã OTP đặt lại mật khẩu</h1>
            </div>
            
            <p>Xin chào ${userName || 'Quý khách'},</p>
            
            <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản EasyBuy. Vui lòng sử dụng mã OTP bên dưới để hoàn tất quá trình đặt lại mật khẩu:</p>
            
            <div class="otp-container">
                <h3>Mã OTP của bạn</h3>
                <div class="otp-code">${otp}</div>
                <p>Mã này có hiệu lực trong <strong>5 phút</strong></p>
            </div>
            
            <div class="warning">
                <strong>⚠️ Lưu ý bảo mật:</strong>
                <ul>
                    <li>Không chia sẻ mã OTP này với bất kỳ ai</li>
                    <li>EasyBuy sẽ không bao giờ yêu cầu mã OTP qua điện thoại</li>
                    <li>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này</li>
                </ul>
            </div>
            
            <p>Nếu bạn gặp khó khăn, vui lòng liên hệ với chúng tôi qua email hỗ trợ.</p>
            
            <div class="footer">
                <p>Trân trọng,<br><strong>Đội ngũ EasyBuy</strong></p>
                <p>Email này được gửi tự động, vui lòng không trả lời.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  async sendWelcomeEmail(toEmail, userName) {
    try {
      const msg = {
        to: toEmail,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: 'Chào mừng bạn đến với EasyBuy!',
        html: this.generateWelcomeEmailTemplate(userName),
        text: `Chào mừng ${userName} đến với EasyBuy!`
      };

      const result = await sgMail.send(msg);
      console.log(`📧 Welcome email sent to ${toEmail}`);
      return { success: true, messageId: result[0].headers['x-message-id'] };
      
    } catch (error) {
      console.error('❌ Welcome email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  generateWelcomeEmailTemplate(userName) {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Chào mừng - EasyBuy</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f4f4f4;
            }
            .email-container {
                background: white;
                border-radius: 10px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo {
                font-size: 28px;
                font-weight: bold;
                color: #667eea;
                margin-bottom: 10px;
            }
            .welcome-banner {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                margin: 20px 0;
            }
            .features {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin: 30px 0;
            }
            .feature {
                text-align: center;
                padding: 20px;
                border: 1px solid #eee;
                border-radius: 10px;
            }
            .button {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 15px 30px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
            }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header">
                <div class="logo">🛒 EasyBuy</div>
            </div>
            
            <div class="welcome-banner">
                <h1>Chào mừng ${userName}!</h1>
                <p>Cảm ơn bạn đã đăng ký tài khoản tại EasyBuy</p>
            </div>
            
            <p>Chào mừng bạn đến với EasyBuy - cửa hàng đồ gia dụng trực tuyến uy tín hàng đầu Việt Nam!</p>
            
            <div class="features">
                <div class="feature">
                    <h3>🛍️ Mua sắm dễ dàng</h3>
                    <p>Hàng ngàn sản phẩm chất lượng cao</p>
                </div>
                <div class="feature">
                    <h3>🚚 Giao hàng nhanh</h3>
                    <p>Giao hàng toàn quốc trong 24-48h</p>
                </div>
                <div class="feature">
                    <h3>💳 Thanh toán an toàn</h3>
                    <p>Nhiều phương thức thanh toán tiện lợi</p>
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="http://localhost:3000" class="button">Bắt đầu mua sắm ngay</a>
            </div>
            
            <p>Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi!</p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666;">
                <p>Trân trọng,<br><strong>Đội ngũ EasyBuy</strong></p>
            </div>
        </div>
    </body>
    </html>
    `;
  }
}

module.exports = EmailService;
