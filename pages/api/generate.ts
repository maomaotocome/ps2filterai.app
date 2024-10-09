import { Ratelimit } from "@upstash/ratelimit";
import type { NextApiRequest, NextApiResponse } from "next";
import requestIp from "request-ip";
import redis from "../../utils/redis";
import { getModelConfig } from "../../utils/modelConfig";
import Replicate from "replicate";

type Data =
  | { result: string }
  | { error: string; details?: string };

interface ExtendedNextApiRequest extends NextApiRequest {
  body: {
    imageUrl: string;
    prompt?: string;
    style?: string;
    prompt_strength?: number;
    denoising_strength?: number;
    instant_id_strength?: number;
    negative_prompt?: string;
  };
}

// Create a new ratelimiter, that allows 3 requests per day
const ratelimit = redis
  ? new Ratelimit({
    redis: redis,
    limiter: Ratelimit.fixedWindow(3, "1440 m"),
    analytics: true,
  })
  : undefined;

// Set a longer timeout for the API route (60 seconds, which is the maximum for Vercel serverless functions)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },
};

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to make a request with retries and timeout
async function replicateApiCall(
  replicate: Replicate,
  modelString: `${string}/${string}:${string}`,
  input: any,
  maxRetries = 3,
  timeout = 50000
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempt ${i + 1} to call Replicate API`);
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeout);

      const output = await Promise.race([
        replicate.run(modelString, { input }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Replicate API call timed out')), timeout)
        )
      ]);

      clearTimeout(timeoutId);

      if (output === undefined) {
        throw new Error('Replicate API call timed out');
      }

      console.log('Replicate API call successful');
      return output;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) throw error;
      await delay(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
  throw new Error(`Failed after ${maxRetries} retries`);
}

export default async function handler(
  req: ExtendedNextApiRequest,
  res: NextApiResponse<Data>
) {
  console.log("API handler started");
  console.log("Request method:", req.method);
  console.log("Request body:", JSON.stringify(req.body));

  try {
    // Check if REPLICATE_API_KEY is set
    if (!process.env.REPLICATE_API_KEY) {
      console.error("REPLICATE_API_KEY is not set in the environment variables");
      return res.status(500).json({ error: "Server configuration error: API key is missing" });
    }

    console.log("REPLICATE_API_KEY is set");

    // Rate Limiter Code
    if (ratelimit) {
      const identifier = requestIp.getClientIp(req);
      console.log("Client IP:", identifier);
      const result = await ratelimit.limit(identifier!);
      res.setHeader("X-RateLimit-Limit", result.limit);
      res.setHeader("X-RateLimit-Remaining", result.remaining);

      if (!result.success) {
        console.log("Rate limit exceeded for IP:", identifier);
        return res.status(429).json({ error: "Too many uploads in 1 day. Please try again after 24 hours." });
      }
    }

    const { imageUrl, prompt: userPrompt, style = "Video game", prompt_strength = 4.5, denoising_strength = 0.65, instant_id_strength = 0.8, negative_prompt: userNegativePrompt } = req.body;

    const model = "face-to-many";
    console.log(`Processing with model: ${model}`);

    const modelConfig = getModelConfig(model);

    if (!modelConfig) {
      throw new Error(`Invalid model configuration for model: ${model}`);
    }

    console.log(`Model configuration: ${JSON.stringify(modelConfig)}`);

    // Prepare input for the face-to-many model
    const modelInput: Record<string, any> = { ...modelConfig.input };
    modelInput.image = imageUrl;
    modelInput.style = style;

    // Enhanced PS2-era prompt
    const prompt = `${userPrompt || ""} PS2 era video game character, low-poly 3D model, 480p resolution, early 2000s video game graphics, jagged edges, limited texture detail, flat shading, pixelated textures, visible polygons, matte finish, simple lighting, basic shadow rendering`;

    // Enhanced negative prompt for PS2-era style
    const negative_prompt = `${userNegativePrompt || ""} high resolution, smooth textures, modern graphics, ray tracing, 4K, HDR, photorealistic, detailed textures, normal mapping, specular highlights, ambient occlusion, anti-aliasing, motion blur, depth of field, volumetric lighting`;

    if (prompt) modelInput.prompt = prompt;
    modelInput.prompt_strength = prompt_strength;
    modelInput.denoising_strength = denoising_strength;
    modelInput.instant_id_strength = instant_id_strength;
    if (negative_prompt) modelInput.negative_prompt = negative_prompt;

    console.log("Request payload:", JSON.stringify({
      version: modelConfig.version,
      input: modelInput,
    }));

    // Initialize Replicate client
    console.log("Initializing Replicate client");
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_KEY,
    });

    // Run the model with retry and timeout
    console.log("Sending request to Replicate API");
    let output;
    try {
      output = await replicateApiCall(
        replicate,
        `${modelConfig.owner}/${model}:${modelConfig.version}` as const,
        modelInput
      );
      console.log("API Response:", output);
    } catch (error) {
      console.error("Error calling Replicate API:", error);
      return res.status(500).json({ error: "Error calling Replicate API", details: (error as Error).message });
    }

    if (!output || !Array.isArray(output) || output.length === 0) {
      console.error("Invalid response from Replicate API:", output);
      throw new Error("Invalid response from Replicate API");
    }

    const generatedImage = output[0];

    // Check if the generated image URL is valid
    try {
      new URL(generatedImage);
    } catch (error) {
      console.error("Invalid generated image URL:", generatedImage);
      return res.status(500).json({ error: "Generated image URL is invalid", details: generatedImage });
    }

    console.log("Sending successful response");
    return res.status(200).json({ result: generatedImage });
  } catch (error) {
    console.error("Unexpected error:", error);
    return res.status(500).json({ error: "An unexpected error occurred. Please try again later.", details: (error as Error).message });
  }
}
