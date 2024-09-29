import * as tf from "@tensorflow/tfjs";
import * as nsfwjs from "nsfwjs";

tf.enableProdMode();

class NSFWPredictor {
  model: nsfwjs.NSFWJS | null = null;
  isModelInitialized: boolean = false;
  modelInitAttempts: number = 0;
  maxInitAttempts: number = 3;

  constructor() {
    this.model = null;
    this.getModel();
  }

  async getModel() {
    if (this.modelInitAttempts >= this.maxInitAttempts) {
      console.error("Max model initialization attempts reached");
      return;
    }

    try {
      this.model = await nsfwjs.load(
        "https://nsfw-model-1.s3.us-west-2.amazonaws.com/nsfw-predict-model/",
        // @ts-ignore
        { type: "graph" }
      );
      this.isModelInitialized = true;
      console.log("NSFW model loaded successfully");
    } catch (error) {
      console.error("Error loading NSFW model:", error);
      this.modelInitAttempts++;
      setTimeout(() => this.getModel(), 2000); // Retry after 2 seconds
    }
  }

  async predict(element: HTMLImageElement, guesses: number) {
    if (!this.isModelInitialized) {
      if (this.modelInitAttempts < this.maxInitAttempts) {
        throw new Error("Model is still initializing. Please try again in a few moments.");
      } else {
        throw new Error("Failed to initialize the model. Please refresh the page and try again.");
      }
    }
    if (!this.model) {
      throw new Error("Model is not available. Please try again later.");
    }
    return this.model.classify(element, guesses);
  }

  async predictImg(file: File, guesses = 5) {
    const url = URL.createObjectURL(file);
    try {
      const img = document.createElement("img");
      img.width = 400;
      img.height = 400;

      img.src = url;
      return await new Promise<nsfwjs.predictionType[]>((res) => {
        img.onload = async () => {
          const results = await this.predict(img, guesses);
          URL.revokeObjectURL(url);
          res(results);
        };
      });
    } catch (error) {
      console.error("Error predicting image:", error);
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  async isSafeImg(file: File) {
    try {
      const predictions = await this.predictImg(file, 3);
      const pornPrediction = predictions.find(
        ({ className }) => className === "Porn"
      );
      const hentaiPrediction = predictions.find(
        ({ className }) => className === "Hentai"
      );

      if (!pornPrediction || !hentaiPrediction) {
        return true;
      }
      return !(
        pornPrediction.probability > 0.25 || hentaiPrediction.probability > 0.25
      );
    } catch (error) {
      console.error("Error checking image safety:", error);
      throw error;
    }
  }
}

export default new NSFWPredictor();
