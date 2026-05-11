type HeaderProps = {
    subtitle?: string;
  };
  
  export default function Header({
    subtitle = "오늘도 편안한 하루 보내세요",
  }: HeaderProps) {
    return (
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-[34px] font-black tracking-tight text-[#3d3128]">
            rem<span className="text-[#7f9f72]">AI</span>n
          </h1>
  
          <p className="mt-1 text-sm text-[#8a7463]">
            {subtitle}
          </p>
        </div>
  
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff8ef]/92 text-xl shadow-sm ring-1 ring-white/90">
          🌿
        </div>
      </header>
    );
  }