import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

// 선생님 페이지 저장이 다른 시험으로 새지 않게 비웁니다.
beforeEach(() => { try { window.localStorage.clear(); } catch { /* node 환경 */ } });
