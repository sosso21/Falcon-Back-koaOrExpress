const jwt = require('jsonwebtoken');

const JWT_SIGN_SECRET = 'ceTikenEstFaux';

// Exported functions
module.exports = {
    generateTokenForUser: (userData, expireIn = (60*15), suplement = null) => {

        let payload = {
            userId: userData._id,
            isAdmin: userData.isAdmin
        };
        if (suplement != null) 
        {
            payload = Object.assign(payload, suplement);
        }


        return jwt.sign(
            payload,
            JWT_SIGN_SECRET, {
                expiresIn: expireIn // sexonde
            })
    },
    parseAuthorization: (authorization) => {
        return (authorization != null) ? authorization.replace('Bearer ', '') : null;
    },
    getUserInfo: (authorization) => {
        let info = -1;
        const token = module.exports.parseAuthorization(authorization);
        if (token != null) {

            try {
                const jwtToken = jwt.verify(token, JWT_SIGN_SECRET);
                if (jwtToken != null)
                    info = jwtToken;

            } catch (err) {}
        }
        console.log('info:', info)
        return info;
    }
}