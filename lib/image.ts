import imageUrlBuilder from "@sanity/image-url";
import { client } from "./sanity/client"; // usa lo stesso client già configurato

const builder = imageUrlBuilder(client);

export function urlFor(source: any) {
  return builder.image(source);
}
