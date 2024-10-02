import { Ratelimit } from "@upstash/ratelimit";
import type { NextApiRequest, NextApiResponse } from "next";
import requestIp from "request-ip";
import redis from "../../utils/redis";
import { getModelConfig } from "../../utils/modelConfig";

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

    // POST request to Replicate to start the image generation process
    console.log("Sending request to Replicate API");
    const startResponse = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
      },
      body: JSON.stringify({
        version: modelConfig.version,
        input: modelInput,
      }),
    });

    console.log("API Response Status:", startResponse.status);

    let jsonStartResponse;
    try {
      jsonStartResponse = await startResponse.json();
      console.log("API Response Body:", JSON.stringify(jsonStartResponse));
    } catch (error) {
      console.error("Error parsing JSON response:", error);
      return res.status(500).json({ error: "Failed to parse API response", details: (error as Error).message });
    }

    if (!startResponse.ok) {
      if (startResponse.status === 401) {
        console.error("Authentication failed. Please check your REPLICATE_API_KEY.");
        return res.status(401).json({ error: "Authentication failed. Please check your API key." });
      }
      return res.status(startResponse.status).json({ error: `API request failed for model ${model} (version ${modelConfig.version}) with status ${startResponse.status}`, details: JSON.stringify(jsonStartResponse) });
    }

    if (!jsonStartResponse.urls || !jsonStartResponse.urls.get) {
      return res.status(500).json({ error: `Invalid response from Replicate API for model ${model} (version ${modelConfig.version})`, details: JSON.stringify(jsonStartResponse) });
    }

    const endpointUrl = jsonStartResponse.urls.get;

    // GET request to get the status of the image generation process & return the result when it's ready
    let generatedImage: string | null = null;
    let retries = 0;
    const maxRetries = 60; // 5 minutes with 5-second intervals
    while (!generatedImage && retries < maxRetries) {
      console.log(`Polling for result... (Attempt ${retries + 1}/${maxRetries})`);
      const finalResponse = await fetch(endpointUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${process.env.REPLICATE_API_KEY}`,
        },
      });

      let jsonFinalResponse;
      try {
        jsonFinalResponse = await finalResponse.json();
        console.log("Polling response:", JSON.stringify(jsonFinalResponse));
      } catch (error) {
        console.error("Error parsing JSON response during polling:", error);
        return res.status(500).json({ error: "Failed to parse API response during polling", details: (error as Error).message });
      }

      if (jsonFinalResponse.status === "succeeded") {
        generatedImage = jsonFinalResponse.output;
        console.log("Image generation succeeded");
        console.log("Generated Image URL:", generatedImage);
        console.log("Full response object:", JSON.stringify(jsonFinalResponse));
      } else if (jsonFinalResponse.status === "failed") {
        const errorMessage = jsonFinalResponse.error || "Unknown error occurred";
        console.error(`Image generation failed: ${errorMessage}`);
        if (errorMessage.includes("No face detected")) {
          return res.status(400).json({ error: "No face detected in the uploaded image. Please try a different image with a clear face." });
        } else {
          return res.status(500).json({ error: `Image generation failed for model ${model} (version ${modelConfig.version})`, details: errorMessage });
        }
      } else if (jsonFinalResponse.status === "processing" || jsonFinalResponse.status === "starting") {
        console.log(`Image is still ${jsonFinalResponse.status}...`);
        retries++;
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before next poll
      } else {
        console.warn(`Unexpected status: ${jsonFinalResponse.status}`);
        retries++;
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before next poll
      }
    }

    if (!generatedImage) {
      console.error(`Image generation timed out after ${maxRetries} attempts`);
      return res.status(504).json({ error: "Image generation timed out. Please try again later." });
    }

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
