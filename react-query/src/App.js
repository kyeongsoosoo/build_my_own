import React from 'react';
import axios from 'axios';
import {QueryClientProvider, QueryClient, useQuery} from './react-query-lite';

const queryClient = new QueryClient();

export default function App() {
  const [postId, setPostId] = React.useState(-1);

  return (
    <QueryClientProvider client={queryClient}>
      <div>
        <div>
          {postId > -1 ? (
            <Post postId={postId} setPostId={setPostId} />
          ) : (
            <Posts setPostId={setPostId} />
          )}
        </div>
      </div>
    </QueryClientProvider>
  );
}

function usePosts() {
  return useQuery({
    queryKey: 'posts',
    queryFn: async () => {
      await sleep(1000);
      const {data} = await axios.get(
        'https://jsonplaceholder.typicode.com/posts',
      );
      return data.slice(0, 5);
    },
  });
}

function usePost(postId) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      await sleep(1000);
      const {data} = await axios.get(
        `https://jsonplaceholder.typicode.com/posts/${postId}`,
      );
      return data;
    },
  });
}

function Posts({setPostId}) {
  const postsQuery = usePosts();

  return (
    <div>
      <h1> Posts</h1>
      <div>
        {postsQuery.status === 'loading' ? (
          <div>loading</div>
        ) : postsQuery.status === 'error' ? (
          <span>Error</span>
        ) : (
          <>
            <ul>
              {postsQuery.data.map(post => (
                <li key={post.id} onClick={() => setPostId(post.id)}>
                  {post.title}
                </li>
              ))}
            </ul>
            <div>{postsQuery.isFetching ? 'Background updating' : ''}</div>
          </>
        )}
      </div>
    </div>
  );
}

function Post({postId, setPostId}) {
  const postQuery = usePost(postId);

  return (
    <div>
      <div>
        <div onClick={() => setPostId(-1)}>Back</div>
      </div>
      <div>
        {!postId || postQuery.status === 'loading' ? (
          <div>Loading...</div>
        ) : postQuery.status === 'error' ? (
          <span>Error</span>
        ) : (
          <>
            <h1>{postQuery.data.title}</h1>
            <div>
              <p>{postQuery.data.body}</p>
            </div>
            <div>{postQuery.isFetching ? 'Background updating...' : ''}</div>
          </>
        )}
      </div>
    </div>
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
