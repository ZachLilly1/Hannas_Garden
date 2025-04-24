export interface PlantHealthDiagnosis {
  issue: string;
  cause: string;
  solution: string;
  preventionTips: string[];
  severity: "low" | "medium" | "high";
  confidenceLevel: "low" | "medium" | "high";
}

export interface PlantIdentificationResult {
  plantType: string;
  commonName: string;
  scientificName: string;
  careRecommendations: {
    waterFrequency: number;
    sunlightLevel: "low" | "medium" | "high";
    fertilizerFrequency: number;
    additionalCare: string;
  };
  confidence: "high" | "medium" | "low";
}