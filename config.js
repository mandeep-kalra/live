'use strict';

module.exports = {
    "development":{
        'secretKey': '7HE91-QM30X-ZYKS5-8G8HA-BCW0J-PDN2C',
        'scrt': 'portal\/\/\'*iD',
        'mongoUrl' : 'mongodb+srv://idiscover:idiscover123@cluster-app.kutxf.mongodb.net/app?retryWrites=true&w=majority',
        'mongoUrl_' : 'mongodb://idiscover:idiscover123@ds229458.mlab.com:29458/app',
        'googleAuth' : {
            'clientID'      : '437438716282-4s1rmctjev4njem80m4a12j5fg47u850.apps.googleusercontent.com',
            'clientSecret'  : 'tPkCriCx-Q7hvS8DwauyutOT',
            'callbackURL'   : 'http://app.idiscover.me/user/auth/google/callback'
        }
    },
    "production":{
        'secretKey': '7HE91-QM30X-ZYKS5-8G8HA-BCW0J-PDN2C',
        'scrt': 'portal\/\/\'*iD',        
        'mongoUrl' : 'mongodb+srv://idiscover:idiscover123@cluster-app.kutxf.mongodb.net/app?retryWrites=true&w=majority',
        'mongoUrl_' : 'mongodb://idiscover:idiscover123@ds229458.mlab.com:29458/app',
        'googleAuth' : {
            'clientID'      : '437438716282-4s1rmctjev4njem80m4a12j5fg47u850.apps.googleusercontent.com',
            'clientSecret'  : 'tPkCriCx-Q7hvS8DwauyutOT',
            'callbackURL'   : 'http://app.idiscover.me/user/auth/google/callback'
        }
    }
};
