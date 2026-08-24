import Image from "next/image";

/**
 * 구매 시뮬레이션 상단 히어로. 순수 CSS 애니메이션(unipig-float, globals.css)만 쓰고
 * 상태/이벤트가 없어서 클라이언트 컴포넌트로 만들 필요는 없다 — PurchaseSimulator(클라이언트)가 불러써도 그대로 번들된다.
 */
export function TimeMachineHero() {
  return (
    <div className="relative flex h-[190px] items-center justify-center overflow-hidden sm:h-[240px]">
      {/* 은은한 파란빛 궤적 — 블러 대신 완전히 투명해지는 radial-gradient라 경계가 안 보임 */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 55% 60% at 50% 50%, var(--accent) 0%, transparent 70%)",
          opacity: 0.22,
        }}
      />

      <div className="relative h-full w-full max-w-[360px]">
        {/* 메인 타임머신 */}
        <div
          className="unipig-float absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ "--float-y": "9px", "--float-rot": "1deg", "--float-duration": "3.5s" } as React.CSSProperties}
        >
          <Image
            src="/simulation/unipig-time-machine.png"
            alt="타임머신을 타고 시간여행 하는 유니피그"
            width={220}
            height={146}
            priority
            unoptimized
            className="h-auto w-[150px] drop-shadow-[0_8px_20px_rgba(125,167,217,0.35)] sm:w-[220px]"
          />
        </div>

        {/* 파란 시계 — 타임머신보다 살짝 느리게, 회전 폭은 더 크게 */}
        <div
          className="unipig-float absolute right-[8%] top-[6%] sm:right-[10%]"
          style={{ "--float-y": "6px", "--float-rot": "3deg", "--float-duration": "4.5s" } as React.CSSProperties}
        >
          <Image
            src="/simulation/simulation-clock.png"
            alt=""
            width={64}
            height={64}
            unoptimized
            className="h-auto w-11 sm:w-14"
          />
        </div>

        {/* 동전 3개 — 각자 다른 크기·속도·딜레이로 서로 어긋나게 */}
        <div
          className="unipig-float absolute left-[6%] top-[18%]"
          style={{ "--float-y": "10px", "--float-rot": "6deg", "--float-duration": "4s", "--float-delay": "-1s" } as React.CSSProperties}
        >
          <Image src="/simulation/simulation-coin-01.png" alt="" width={40} height={40} unoptimized className="h-auto w-7 sm:w-9" />
        </div>

        <div
          className="unipig-float absolute right-[2%] bottom-[16%] hidden sm:block"
          style={{ "--float-y": "7px", "--float-rot": "-8deg", "--float-duration": "5s", "--float-delay": "-2.3s" } as React.CSSProperties}
        >
          <Image src="/simulation/simulation-coin-02.png" alt="" width={34} height={34} unoptimized className="h-auto w-6 sm:w-8" />
        </div>

        <div
          className="unipig-float absolute bottom-[10%] left-[16%] hidden sm:block"
          style={{ "--float-y": "12px", "--float-rot": "5deg", "--float-duration": "3.8s", "--float-delay": "-0.6s" } as React.CSSProperties}
        >
          <Image src="/simulation/simulation-coin-03.png" alt="" width={36} height={36} unoptimized className="h-auto w-6 sm:w-8" />
        </div>
      </div>
    </div>
  );
}
