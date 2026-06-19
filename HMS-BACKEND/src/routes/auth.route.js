const express = require('express');

const router = express.Router();
const authValidator = require('../validation/auth.validation')

const validate = require('../middleware/validate');
const authMiddleware = require('../middleware/authMiddleware')

const authController=require('../controller/authController');



router.post('/login',
    authValidator.validateLogin,
    validate,
    authController.login)


    console.log("authMiddleware type:", typeof authMiddleware);
console.log("changePassword type:", typeof authController.changePassword);


router.post('/change-password',
    authMiddleware,
    authController.changePassword
)

router.post('/logout',
    authController.logout
)

router.get('/verify-email/:token',
     authController.verifyEmail);

module.exports = router;