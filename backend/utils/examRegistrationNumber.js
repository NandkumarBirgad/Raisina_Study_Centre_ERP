import Center from "../models/Center.js";
import ExamRegistration from "../models/ExamRegistration.js";

export const generateExamRegistrationNumber = async (centerId, year) => {
  const center = await Center.findById(centerId).select("centerCode");

  const centerCode = center?.centerCode || "CTR";

  const count = await ExamRegistration.countDocuments({
    preferredCenter: centerId,
    year,
  });

  const sequence = String(count + 1).padStart(4, "0");

  return `EXM-${centerCode}-${year}-${sequence}`;
};