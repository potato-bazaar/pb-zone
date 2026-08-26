type ContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div
      className={`mx-auto box-border w-full max-w-screen-sm px-4 sm:px-6 ${className}`}
    >
      {children}
    </div>
  );
}
