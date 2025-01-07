import Image, { type ImageProps } from "next/image";
import { Button } from "@repo/ui/button";
import ClientComponent from "./ClientComponent";
import { Suspense } from "react";

type Props = Omit<ImageProps, "src"> & {
  srcLight: string;
  srcDark: string;
};

const ThemeImage = (props: Props) => {
  const { srcLight, srcDark, ...rest } = props;

  return (
    <>
      <Image {...rest} src={srcLight} className="imgLight" />
      <Image {...rest} src={srcDark} className="imgDark" />
    </>
  );
};

export default async function Home() {
  return (
    <div>
      <Suspense>
        <ClientComponent />
      </Suspense>
    </div>
  );
}
