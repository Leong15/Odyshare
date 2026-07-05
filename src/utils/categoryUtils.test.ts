import { describe, it, expect } from "vitest";
import {
  getItineraryCategoryLabel,
  getCategoryLabel,
  getCategoryBadgeClasses,
  getCategoryDotColor,
  mapEditCategoryToItemCategory,
} from "./categoryUtils";

describe("Category Utility Functions", () => {
  describe("getItineraryCategoryLabel", () => {
    it("should translate 'restaurant' category", () => {
      expect(getItineraryCategoryLabel("restaurant", "zh")).toBe("🍱 餐廳 / 美食餐飲");
      expect(getItineraryCategoryLabel("restaurant", "en")).toBe("Restaurant / Food");
    });

    it("should translate 'hotel' category", () => {
      expect(getItineraryCategoryLabel("hotel", "zh")).toBe("🏨 酒店 / 入住民宿");
      expect(getItineraryCategoryLabel("hotel", "en")).toBe("Hotel Stay");
    });

    it("should fallback to other category if unknown", () => {
      expect(getItineraryCategoryLabel("unknown-cat", "en")).toBe("Other");
    });
  });

  describe("getCategoryLabel", () => {
    it("should map flight category properly", () => {
      expect(getCategoryLabel("flight", "zh")).toBe("機票航空");
      expect(getCategoryLabel("flight", "en")).toBe("Flight");
    });

    it("should fallback to other category label", () => {
      expect(getCategoryLabel("unknown-exp", "zh")).toBe("其他雜支");
      expect(getCategoryLabel("unknown-exp", "en")).toBe("Other");
    });
  });

  describe("getCategoryBadgeClasses", () => {
    it("should return correct css styles for flight category", () => {
      const classes = getCategoryBadgeClasses("flight");
      expect(classes).toContain("bg-blue-500");
    });

    it("should fallback for unknown", () => {
      const classes = getCategoryBadgeClasses("xyz");
      expect(classes).toContain("bg-slate-500");
    });
  });

  describe("getCategoryDotColor", () => {
    it("should return bg color class for lodging", () => {
      expect(getCategoryDotColor("lodging")).toBe("bg-indigo-500");
    });

    it("should fallback to gray dot for other", () => {
      expect(getCategoryDotColor("any-other")).toBe("bg-slate-500");
    });
  });

  describe("mapEditCategoryToItemCategory", () => {
    it("should map categories correctly", () => {
      expect(mapEditCategoryToItemCategory("food")).toBe("restaurant");
      expect(mapEditCategoryToItemCategory("sight")).toBe("sight");
      expect(mapEditCategoryToItemCategory("hotel")).toBe("hotel");
    });
  });
});
