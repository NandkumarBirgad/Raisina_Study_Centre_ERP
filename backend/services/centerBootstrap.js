import Center from "../models/Center.js";
import { DEFAULT_CENTERS } from "../constants/defaultCenters.js";

export const ensureDefaultCenters = async () => {
  const ensuredCenters = [];

  for (const defaultCenter of DEFAULT_CENTERS) {
    let center = await Center.findOne({
      $or: [
        { centerCode: defaultCenter.centerCode },
        { centerName: defaultCenter.centerName },
      ],
      deleted: { $ne: true },
    });

    if (!center) {
      center = await Center.create(defaultCenter);
    } else {
      let changed = false;

      for (const field of ["centerName", "city", "state", "centerCode", "address"]) {
        if (!center[field] && defaultCenter[field]) {
          center[field] = defaultCenter[field];
          changed = true;
        }
      }

      if (changed) {
        await center.save();
      }
    }

    ensuredCenters.push(center);
  }

  return ensuredCenters;
};