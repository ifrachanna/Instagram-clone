import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req, res, next) => {
  try {
    const { username, fullName, email, password } = req.body;

    // 1. Validate required fields
    if (!username || !fullName || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide username, full name, email, and password.',
      });
    }

    // 2. Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long.',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // 3. Check if username is already taken
    const existingUsername = await User.findOne({ username: cleanUsername });
    if (existingUsername) {
      return res.status(409).json({
        status: 'error',
        message: 'Username is already taken. Please choose another.',
      });
    }

    // 4. Check if email is already registered
    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(409).json({
        status: 'error',
        message: 'Email address is already registered. Please login.',
      });
    }

    // 5. Create new user (Password will be hashed automatically by pre-save hook in User model)
    const user = await User.create({
      username: cleanUsername,
      fullName: fullName.trim(),
      email: cleanEmail,
      password,
    });

    // 6. Generate JWT token
    const token = generateToken(user._id);

    // 7. Return sanitized response
    res.status(201).json({
      status: 'success',
      message: 'Account created successfully!',
      token,
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        website: user.website,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        isPrivate: user.isPrivate,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res, next) => {
  try {
    const { identifier, email, username, password } = req.body;

    // Allow login with identifier (email OR username), or explicit email/username
    const loginCredential = (identifier || email || username || '').trim().toLowerCase();

    if (!loginCredential || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide your email/username and password.',
      });
    }

    // Find user by either email or username and explicitly include the password field
    const user = await User.findOne({
      $or: [{ email: loginCredential }, { username: loginCredential }],
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials. User does not exist.',
      });
    }

    // Check if password matches using model's comparePassword method
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Return sanitized response
    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully!',
      token,
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        website: user.website,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        isPrivate: user.isPrivate,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently logged-in user profile
 * @route   GET /api/auth/me
 * @access  Private (Requires JWT)
 */
export const getMe = async (req, res, next) => {
  try {
    // req.user was populated by the protect middleware
    const user = await User.findById(req.user._id)
      .populate('followers', 'username fullName avatar isVerified')
      .populate('following', 'username fullName avatar isVerified');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User profile not found.',
      });
    }

    res.status(200).json({
      status: 'success',
      user: {
        _id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        website: user.website,
        gender: user.gender,
        followers: user.followers,
        following: user.following,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        savedPosts: user.savedPosts,
        isPrivate: user.isPrivate,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
