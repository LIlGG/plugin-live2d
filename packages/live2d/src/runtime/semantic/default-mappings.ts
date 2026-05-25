import type { SemanticName, ParameterId } from "./types";

export const DEFAULT_SEMANTIC_MAPPINGS: Record<SemanticName, ParameterId[]> = {
  // Mouth
  mouthOpen: [
    "PARAM_MOUTH_OPEN_Y",
    "PARAM_MOUTH_A",
    "ParamMouthA",
    "MOUTH_OPEN",
  ],
  mouthForm: [
    "PARAM_MOUTH_FORM",
    "PARAM_MOUTH_FORM_01",
    "ParamMouthForm01",
  ],
  mouthSmile: [
    "PARAM_MOUTH_SMILE",
    "ParamMouthSmile",
    "PARAM_MOUTH_SMILE_01",
    "PARAM_MOUTH_OPEN_SMILE",
  ],

  // Eyes
  eyeLOpen: [
    "PARAM_EYE_L_OPEN",
    "ParamEyeLOpen",
    "EYE_L_OPEN",
    "PARAM_EYE_OPEN_L",
  ],
  eyeROpen: [
    "PARAM_EYE_R_OPEN",
    "ParamEyeROpen",
    "EYE_R_OPEN",
    "PARAM_EYE_OPEN_R",
  ],
  eyeLSmile: [
    "PARAM_EYE_L_SMILE",
    "ParamEyeLSmile",
    "PARAM_EYE_SMILE_L",
    "PARAM_EYE_OPEN_L_SMILE",
  ],
  eyeRSmile: [
    "PARAM_EYE_R_SMILE",
    "ParamEyeRSmile",
    "PARAM_EYE_SMILE_R",
    "PARAM_EYE_OPEN_R_SMILE",
  ],
  eyeBallX: [
    "PARAM_EYE_BALL_X",
    "ParamEyeBallX",
    "EYE_BALL_X",
    "PARAM_EYE_BALL_L_X",
    "PARAM_EYE_BALL_R_X",
  ],
  eyeBallY: [
    "PARAM_EYE_BALL_Y",
    "ParamEyeBallY",
    "EYE_BALL_Y",
    "PARAM_EYE_BALL_L_Y",
    "PARAM_EYE_BALL_R_Y",
  ],

  // Head angles
  angleX: ["PARAM_ANGLE_X", "ParamAngleX", "ANGLE_X", "HeadX"],
  angleY: ["PARAM_ANGLE_Y", "ParamAngleY", "ANGLE_Y", "HeadY"],
  angleZ: ["PARAM_ANGLE_Z", "ParamAngleZ", "ANGLE_Z", "HeadZ"],

  // Body
  bodyAngleX: [
    "PARAM_BODY_ANGLE_X",
    "ParamBodyAngleX",
    "BODY_ANGLE_X",
  ],
  bodyAngleY: [
    "PARAM_BODY_ANGLE_Y",
    "ParamBodyAngleY",
    "BODY_ANGLE_Y",
  ],
  bodyAngleZ: [
    "PARAM_BODY_ANGLE_Z",
    "ParamBodyAngleZ",
    "BODY_ANGLE_Z",
  ],

  // Breathing
  breath: ["PARAM_BREATH", "ParamBreath", "BREATH", "PARAM_BREATHING"],

  // Brows
  browLY: [
    "PARAM_BROW_L_Y",
    "ParamBrowLY",
    "BROW_L_Y",
    "PARAM_BROW_LY",
    "PARAM_BROW_LEFT_Y",
  ],
  browRY: [
    "PARAM_BROW_R_Y",
    "ParamBrowRY",
    "BROW_R_Y",
    "PARAM_BROW_RY",
    "PARAM_BROW_RIGHT_Y",
  ],
  browLAngle: [
    "PARAM_BROW_L_ANGLE",
    "ParamBrowLAngle",
    "BROW_L_ANGLE",
    "PARAM_BROW_L_ANGLE_Z",
    "PARAM_BROW_LEFT_ANGLE",
  ],
  browRAngle: [
    "PARAM_BROW_R_ANGLE",
    "ParamBrowRAngle",
    "BROW_R_ANGLE",
    "PARAM_BROW_R_ANGLE_Z",
    "PARAM_BROW_RIGHT_ANGLE",
  ],
  browLForm: ["PARAM_BROW_L_FORM", "ParamBrowLForm", "BROW_L_FORM"],
  browRForm: ["PARAM_BROW_R_FORM", "ParamBrowRForm", "BROW_R_FORM"],

  // Cheeks / blush
  cheek: [
    "PARAM_CHEEK",
    "ParamCheek",
    "CHEEK",
    "PARAM_BLUSH",
    "ParamBlush",
    "PARAM_CHEEK_R",
    "PARAM_CHEEK_L",
    "PARAM_CHEEK_01",
    "PARAM_CHEEK_02",
  ],

  // Arms
  armLA: ["PARAM_ARM_L_A", "ParamArmL"],
  armRA: ["PARAM_ARM_R_A", "ParamArmR"],

  // Hair
  hairFront: ["PARAM_HAIR_FRONT", "ParamHairFront"],
  hairSide: ["PARAM_HAIR_SIDE", "ParamHairSide"],
  hairBack: ["PARAM_HAIR_BACK", "ParamHairBack"],

  // Physics-like
  skirt: ["PARAM_SKIRT", "ParamSkirt"],
  ribbon: ["PARAM_RIBBON", "ParamRibbon"],
};
