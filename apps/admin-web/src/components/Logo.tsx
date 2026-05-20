type LogoProps = {
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
};

const LOGO_URL =
  'https://res.cloudinary.com/dljpzbo20/image/upload/e_background_removal/amaravathi_logo.png';
const LOGO_FALLBACK_URL =
  'https://res.cloudinary.com/dljpzbo20/image/upload/e_background_removal/amaravathi_logo.png';

export function Logo({
  width = 180,
  height = 60,
  className = '',
  priority = false,
}: LogoProps) {
  return (
    <img
      src={LOGO_URL}
      alt="Amaravathi Tea Powder"
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      onError={(event) => {
        if (event.currentTarget.src !== LOGO_FALLBACK_URL) {
          event.currentTarget.src = LOGO_FALLBACK_URL;
        }
      }}
    />
  );
}
