import Link from 'next/link';

interface KidButtonProps {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export default function KidButton({ 
  href, 
  onClick, 
  children, 
  className = '', 
  disabled = false 
}: KidButtonProps) {
  const baseClass = "kid-button inline-block text-center cursor-pointer";
  const disabledClass = disabled ? "opacity-50 cursor-not-allowed" : "";
  
  const combinedClassName = `${baseClass} ${className} ${disabledClass}`;

  if (href) {
    return (
      <Link href={href} className={combinedClassName}>
        {children}
      </Link>
    );
  }

  return (
    <button 
      onClick={onClick} 
      className={combinedClassName}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
