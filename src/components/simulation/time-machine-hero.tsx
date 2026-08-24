import Image from "next/image";

type SparkleProps = {
  left: string;
  top: string;
  size: number;
  duration: string;
  delay: string;
};

/** 큰 PNG 대신 작은 개별 별 모양 하나 — UniPig가 지나간 자리에 잠깐 반짝인다 */
function Sparkle({ left, top, size, duration, delay }: SparkleProps) {
  return (
    <div
      aria-hidden
      className="unipig-twinkle absolute z-10"
      style={
        {
          left,
          top,
          width: size,
          height: size,
          background: "var(--accent)",
          clipPath:
            "polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)",
          "--twinkle-duration": duration,
          "--twinkle-delay": delay,
        } as React.CSSProperties
      }
    />
  );
}

/**
 * 구매 시뮬레이션 하단 히어로 — UniPig가 타임머신을 타고 이 영역 안을
 * 실제로 날아다니는 하나의 작은 장면. 큰 곡선 루프(unipig-flight)를
 * 타고 포털 근처에서 출발/복귀하고, 동전·시계·카드는 각자 다른 속도와
 * 경로로 독립적으로 움직인다. 순수 CSS 애니메이션이라 클라이언트
 * 컴포넌트일 필요는 없다 — PurchaseSimulator(클라이언트)가 불러써도 그대로 번들된다.
 */
export function TimeMachineHero() {
  return (
    <div className="relative flex h-[230px] items-center justify-center sm:h-[320px]">
      {/* 은은한 파란빛 궤적 — 페이지 배경/그라데이션은 이미 확정된 부분이라 그대로 유지, 손대지 않음 */}
      <div aria-hidden className="absolute inset-0">
        <div
          className="absolute left-1/2 top-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[260px] sm:w-[260px]"
          style={{
            background: "radial-gradient(circle, var(--accent) 0%, transparent 100%)",
            opacity: 0.07,
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[140px] w-[140px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[185px] sm:w-[185px]"
          style={{
            background: "radial-gradient(circle, var(--accent) 0%, transparent 100%)",
            opacity: 0.1,
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[90px] w-[90px] -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-[125px] sm:w-[125px]"
          style={{
            background: "radial-gradient(circle, var(--accent) 0%, transparent 100%)",
            opacity: 0.15,
          }}
        />
      </div>

      {/* 장면 전체(포털/캐릭터/소품)의 좌표 기준이 되는 래퍼 */}
      <div className="relative h-full w-full max-w-[440px]">
        {/* 시간 포털 — 캐릭터가 출발/복귀하는 지점. 거의 정지해 있지만 아주 느리게 살아있다 */}
        <div
          className="unipig-portal-pulse absolute z-0 blur-[1px]"
          style={{ left: "13%", top: "72%", transform: "translate(-50%, -50%)" }}
        >
          <Image
            src="/simulation/simulation-portal.png"
            alt=""
            width={520}
            height={347}
            unoptimized
            style={{ width: "clamp(150px, 42vw, 300px)", height: "auto" }}
          />
        </div>

        {/* 금융 소품(카드) — 캐릭터보다 작고 흐리게, 배경을 천천히 가로지르며 등장/소멸 */}
        <div
          className="unipig-card-drift absolute z-0"
          style={{ left: "6%", top: "60%", transform: "translate(-50%, -50%)", opacity: 0.18 }}
        >
          <Image
            src="/simulation/simulation-card.png"
            alt=""
            width={640}
            height={404}
            unoptimized
            style={{ width: "clamp(72px, 20vw, 116px)", height: "auto" }}
          />
        </div>

        {/* 동전 2개 — 서로 다른 작은 궤도를 독립적으로 공전(하나는 시계방향, 하나는 반시계방향) */}
        <div
          className="unipig-orbit-a absolute z-10"
          style={{ left: "22%", top: "66%", transform: "translate(-50%, -50%)" }}
        >
          <Image
            src="/simulation/simulation-coin-01.png"
            alt=""
            width={200}
            height={200}
            unoptimized
            style={{ width: "clamp(30px, 8vw, 42px)", height: "auto" }}
          />
        </div>

        <div
          className="unipig-orbit-b absolute z-10"
          style={{ left: "72%", top: "34%", transform: "translate(-50%, -50%)" }}
        >
          <Image
            src="/simulation/simulation-coin-02.png"
            alt=""
            width={200}
            height={200}
            unoptimized
            style={{ width: "clamp(24px, 6vw, 34px)", height: "auto" }}
          />
        </div>

        {/* 파란 시계 — 오른쪽 위 ↔ 중앙을 아주 느리게 왕복. 안에 약한 bobbing을 중첩해서 무중력감을 준다 */}
        <div
          className="unipig-clock-drift absolute z-10"
          style={{ left: "80%", top: "15%", transform: "translate(-50%, -50%)" }}
        >
          <div
            className="unipig-float"
            style={{ "--float-y": "5px", "--float-rot": "2deg", "--float-duration": "5.5s" } as React.CSSProperties}
          >
            <Image
              src="/simulation/simulation-clock.png"
              alt=""
              width={200}
              height={200}
              unoptimized
              style={{ width: "clamp(46px, 13vw, 68px)", height: "auto" }}
            />
          </div>
        </div>

        {/* 메인 타임머신 — 큰 곡선 루프(unipig-flight)로 실제 이동, 방향에 따라 기울고 스케일이 변한다.
            안쪽엔 별도의 약한 bobbing만 중첩(위치 이동과 회전/스케일은 바깥쪽 담당) */}
        <div
          className="unipig-flight absolute z-20"
          style={{ left: "12%", top: "74%", transform: "translate(-50%, -50%)" }}
        >
          <div
            className="unipig-float"
            style={{ "--float-y": "4px", "--float-rot": "1.5deg", "--float-duration": "3s" } as React.CSSProperties}
          >
            <Image
              src="/simulation/unipig-time-machine.png"
              alt="타임머신을 타고 시간여행 하는 유니피그"
              width={1536}
              height={1024}
              priority
              unoptimized
              style={{ width: "clamp(140px, 38vw, 236px)", height: "auto" }}
            />
          </div>
        </div>

        {/* 반짝임 — 경로 곳곳에 작은 별을 흩뿌려서 지나간 자리에 잠깐씩만 나타났다 사라지게 */}
        <Sparkle left="30%" top="50%" size={10} duration="3.4s" delay="-1.1s" />
        <Sparkle left="63%" top="30%" size={8} duration="2.8s" delay="-2s" />
        <Sparkle left="70%" top="58%" size={12} duration="4s" delay="-0.4s" />
        <Sparkle left="40%" top="70%" size={7} duration="3s" delay="-2.6s" />
      </div>
    </div>
  );
}
