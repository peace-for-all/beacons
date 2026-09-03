import catalogJson from "@/content/catalog.json";
import { contentCatalogSchema } from "@/lib/domain/schemas";

export const catalog = contentCatalogSchema.parse(catalogJson);
