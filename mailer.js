var nodemailer = require("nodemailer");
var express = require('express');
var app = express();

/*
    Here we are configuring our SMTP Server details.
    STMP is mail server which is responsible for sending and recieving email.
*/
var smtpTransport = nodemailer.createTransport({
	service: 'Gmail',
	auth: {
		user: "info@idiscover.me",
		pass: "MandeepR123"
	}
});

//var smtpTransport = nodemailer.createTransport('smtps://info@idiscover.me:idiscover123');

var mailOptions, link, token;

/*------------------SMTP Over-----------------------------*/

/*------------------Routing Started ------------------------*/

exports.custom_mail = function (data, callback) {
	// console.log(data.to)
	if (Array.isArray(data.to)) {
		if (data.to.indexOf('mandeep@idiscover.me') != -1)
			data.to.push('pranam@idiscover.me');
	}
	else if (data.to == 'mandeep@idiscover.me')
		data.to = [data.to, 'pranam@idiscover.me'];

	mailOptions = {
		from: '"iDiscover.me" info@idiscover.me',
		bcc: data.to,
		subject: data.subject,
		html: data.html
	};
	// console.log(mailOptions);

	smtpTransport.sendMail(mailOptions, function (error, response) {
		if (error) {
			console.log(error);
			callback(false);
		}
		else {
			//console.log("Message sent: ");
			console.log(response);
			callback(true);
		}
	});
};

exports.lost_details = function (data, callback) {
	//console.log(data);

	link = "app.idiscover.me/#/reset/" + data.username + '/' + data.token;
	//console.log(link);

	mailOptions = {
		from: '"iDiscover.me" info@idiscover.me',
		to: data.username,
		subject: "iDiscover.me | Request for Password Change",
		html: 'Hello,<br><br> Please click on the link to change your password. This link is only valid for <b>one</b> hour.<br><a href=' + link + '>Click Here to Change Your Password</a>'
	};
	//console.log(mailOptions);

	smtpTransport.sendMail(mailOptions, function (error, response) {
		if (error) {
			//console.log(error);
			callback(false);
		}
		else {
			//console.log("Message sent: ");
			//console.log(response);
			callback(true);
		}
	});
};
//console.log(module.exports);
/*--------------------Routing Over----------------------------*/
