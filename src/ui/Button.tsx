import type { ComponentProps } from "react";

type Props = ComponentProps<"button"> & {
  variant?: "primary" | "ghost";
};

export function Button({ variant = "ghost", className, type, ...rest }: Props) {
  return (
    <button
      type={type ?? "button"}
      className={`tiv-btn tiv-btn--${variant}${className ? ` ${className}` : ""}`}
      {...rest}
    />
  );
}
