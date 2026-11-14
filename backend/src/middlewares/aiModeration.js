import ai from '../utils/geminiClient.js';
import cloudinary from '../config/cloudinary.js';

/**
 * Middleware: AI Content Moderation using Google Gemini
 * Analyzes captions and media context for toxicity, hate speech, explicit content, or violence.
 * - Rejects request if content violates safety standards.
 * - Passes request to next() if safe, attaching req.aiModeration details.
 */
export const moderatePostContent = async (req, res, next) => {
  const caption = (req.body.caption || '').trim();
  const files = req.files || (req.file ? [req.file] : []);

  // Default clean moderation state
  req.aiModeration = {
    isAppropriate: true,
    flaggedReason: '',
    confidenceScore: 1.0,
  };

  // If Gemini client is not initialized (e.g. API key not provided in development)
  if (!ai) {
    return next();
  }

  // If there is nothing to analyze (no caption and no files)
  if (!caption && files.length === 0) {
    return next();
  }

  try {
    const mediaUrls = files.map((f) => f.path || f.url).filter(Boolean);

    const prompt = `
You are an automated, high-precision Content Moderation AI for an Instagram social network.
Analyze the following user-submitted post caption and media references for community safety.

Post Caption: "${caption}"
Attached Media URLs: ${mediaUrls.join(', ') || 'None'}

Evaluate whether the post contains:
1. Hate speech, discrimination, or harassment.
2. Graphic violence, gore, or self-harm encouragement.
3. Sexually explicit, NSFW, or pornographic content.
4. Dangerous, illegal activities, or scam promotions.

You MUST respond strictly in valid JSON format with NO markdown wrapping, matching this exact schema:
{
  "isAppropriate": boolean,
  "flaggedReason": string,
  "confidenceScore": number
}

Rules:
- If appropriate: "isAppropriate" must be true, "flaggedReason" must be "", and "confidenceScore" between 0.8 and 1.0.
- If inappropriate: "isAppropriate" must be false, "flaggedReason" must be a concise explanation, and "confidenceScore" between 0.8 and 1.0.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const responseText = response.text ? response.text.trim() : '';

    // Extract JSON block even if model includes whitespace or code fences
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    let moderationResult = {
      isAppropriate: true,
      flaggedReason: '',
      confidenceScore: 1.0,
    };

    if (jsonMatch) {
      moderationResult = JSON.parse(jsonMatch[0]);
    }

    // Attach moderation assessment to request for saving in the Post model
    req.aiModeration = {
      isAppropriate: Boolean(moderationResult.isAppropriate),
      flaggedReason: moderationResult.flaggedReason || '',
      confidenceScore: Number(moderationResult.confidenceScore) || 0.9,
    };

    // If flagged as inappropriate, remove uploaded files from Cloudinary and reject
    if (!req.aiModeration.isAppropriate) {
      // Cleanup uploaded files from Cloudinary
      for (const file of files) {
        if (file.filename) {
          const resourceType = file.mimetype?.startsWith('video/') ? 'video' : 'image';
          await cloudinary.uploader.destroy(file.filename, { resource_type: resourceType }).catch(() => {});
        }
      }

      return res.status(400).json({
        status: 'fail',
        message: 'Content rejected: Post violates community guidelines.',
        reason: req.aiModeration.flaggedReason,
        moderation: req.aiModeration,
      });
    }

    // Content is safe -> continue to controller
    next();
  } catch (error) {
    console.error('[AI Moderation Error]:', error.message);
    // In case of AI service timeout or parsing failure, log error and allow graceful continuation
    req.aiModeration = {
      isAppropriate: true,
      flaggedReason: 'AI moderation check skipped due to service error',
      confidenceScore: 0.5,
    };
    next();
  }
};

export default moderatePostContent;
