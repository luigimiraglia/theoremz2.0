import { type SchemaTypeDefinition } from "sanity";
import latex from "../schemas/latex";
import imageExternal from "../schemas/imageExternal";

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [latex, imageExternal],
};
