import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  href?: string;
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { logoClass: "h-6 w-auto", iconClass: "h-6 w-6" },
  md: { logoClass: "h-7 w-auto", iconClass: "h-7 w-7" },
  lg: { logoClass: "h-10 w-auto", iconClass: "h-10 w-10" },
};

export function Logo({
  href = "/",
  className,
  showWordmark = true,
  size = "md",
}: LogoProps) {
  const { logoClass, iconClass } = sizeMap[size];

  const content = (
    <span className={cn("inline-flex items-center", className)}>
      {showWordmark ? (
        <>
          <Image
            src="/images/panopin-logo-light.png"
            alt="Panopin"
            width={512}
            height={135}
            className={cn(logoClass, "block dark:hidden")}
            priority
          />
          <Image
            src="/images/panopin-logo-dark.png"
            alt="Panopin"
            width={512}
            height={135}
            className={cn(logoClass, "hidden dark:block")}
            priority
          />
        </>
      ) : (
        <Image
          src="/images/icon.png"
          alt="Panopin"
          width={256}
          height={256}
          className={iconClass}
          priority
        />
      )}
    </span>
  );

  if (!href) return content;
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {content}
    </Link>
  );
}
