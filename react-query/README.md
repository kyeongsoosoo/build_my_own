[Let's Build React Query in 150 Lines of Code!](https://portal.gitnation.org/contents/lets-build-react-query-in-150-lines-of-code)를 보고 정리한 예제입니다.

# 동기

React Query를 접하기 전 상태관리를 저장하기 위해 Redux 라이브러리를 주로 사용했습니다.
Redux Saga와 조합하여 쓰는 경우가 많았고 그때의 주요 목적은 서버의 상태를 받아와 저장하는 것이었습니다.
반복적인 Saga 코드를 처리하는 함수까지 만들고 나면 Redux의 목적에 대해 의문이 생기곤 했습니다.
Redux의 목적인 Client State의 관리보다는 Saga를 활용한 Server state의 저장이 주 목적이 된 느낌이 들기 때문입니다.

[React Query Community의 글](https://tkdodo.eu/blog/practical-react-query#client-state-vs-server-state)을 보면서 기존에 생각했던 내용과 비슷하여 공감할 수 있었습니다. 
App의 입장에서 Server state의 data는 Server로부터 잠깐 빌려온 것이라는 표현이 마음에 들었습니다.

최근 프로젝트에서는 Redux와 Saga의 조합보다는 Redux + React Query 혹은 Context API + React Query의 조합을 사용하려고 시도 중입니다.
관심사의 분리, 선언적 프로그래밍이 가능하다는 장점이 만족스럽습니다.

다만 Redux에 비해 Library 자체가 제공하는 기능이 많다보니 내부적으로 어떻게 동작하는지 Redux보다 예상하기 어려웠습니다.
관련 자료를 조사하다가 Library의 Maintainer가 제작한 영상을 찾아 내부 구현의 기본적인 형태를 배울 수 있었습니다.

# 정리

Redux에서 App 전체를 감싸는 Provider를 통해 store를 전달할 수 있었던 것처럼 React Query도 App을 감싸는 QueryClientProvider가 있습니다.

QueryClient 객체를 생성해 Provider에 전달합니다.
Lite 버전에서 QueryClient는 query를 보관하고 getQuery 메서드를 통해 query를 반환할 수 있습니다.
queryHash를 통해 query를 찾을 수 있습니다. hash를 stringify하여 사용하기 때문에 useQuery hook에서 queryKey를 넣을 때에 다양한 타입을 받을 수 있습니다.

queries에 찾는 hash가 존재하지 않을 경우 새로 query를 생성합니다. 
이 과정이 이번 구현의 핵심입니다.
실행하는 함수를 순서대로 따라가겠습니다.

먼저 createQuery 함수에 options를 넣고 실행합니다.
이때 만들어지는 query는 기본적으로 status가 loading으로 설정되어 있습니다.
fetch 메서드에서 전달받은 queryFn을 실행하여 서버 통신 과정을 거칩니다. 기존의 방식과 비슷하게 loading 상태에서 success/error로 status가 변화합니다.
promise 프로퍼티에 함수가 할당되는데 이것은 실행 중 dedupe(중복 실행)을 막기 위해서입니다.


