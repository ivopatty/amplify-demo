import { API, graphqlOperation } from 'aws-amplify';
import { withAuthenticator } from 'aws-amplify-react-native';
import * as React from 'react';
import { useEffect, useReducer } from 'react';
import { ActivityIndicator, Button, LayoutAnimation, ScrollView, View } from 'react-native';
import { Input, List, ListItem, Text } from 'react-native-ui-kitten';
import { createTodo, updateTodo } from './graphql/mutations';
import { onCreateTodo, onUpdateTodo } from './graphql/subscriptions';
import Icon from 'react-native-vector-icons/FontAwesome'

const listTodos = `query listTodos {
  listTodos{
    items{
      id
      completed
      name
      description
    }
  }
}`;

const addTodo = `mutation createTodo($name:String! $description: String!) {
  createTodo(input:{
    name:$name
    description:$description
  }){
    id
    name
    description
  }
}`;

// Action Types
const QUERY = 'QUERY';
const LOAD_MORE = 'LOAD_MORE';
const SET_TITLE = 'SET_TITLE';
const SET_DESCRIPTION = 'SET_DESCRIPTION';
const START_LOADING = 'START_LOADING';
const CLEAR_NEW = 'CLEAR_NEW';
const SUBSCRIPTION = 'SUBSCRIPTION';
const UPDATE = 'UPDATE';

const initialState: ReducerState = {
  todos: [],
  loading: false,
  newDescription: null,
  newTitle: null,
};

const reducer = (state, action): ReducerState => {
  switch (action.type) {
    case QUERY:
      return { ...state, todos: action.todos };
    case LOAD_MORE:
      return { ...state, todos: [...state.todos, ...action.todos] };
    case SET_TITLE:
      return { ...state, newTitle: action.title };
    case SET_DESCRIPTION:
      return { ...state, newDescription: action.description };
    case START_LOADING:
      return { ...state, loading: true };
    case CLEAR_NEW:
      return { ...state, loading: false, newTitle: null, newDescription: null };
    case SUBSCRIPTION:
      LayoutAnimation.easeInEaseOut();
      return { ...state, todos: [...state.todos, action.todo] };
    case UPDATE:
      LayoutAnimation.easeInEaseOut();
      const currentIndex = state.todos.findIndex(record => record.id === action.todo.id);
      const r = state.todos.map((item, index) => {
        if (index !== currentIndex) {
          // This isn't the item we care about - keep it as-is
          return item;
        }
        // Otherwise, this is the one we want - return an updated value
        return {
          ...item,
          ...action.todo,
        };
      });
      return { ...state, todos: r };
    default:
      return state;
  }
};

interface ReducerState {
  newTitle: string,
  newDescription: string,
  loading: boolean,
  todos: Array<{
    __typename: 'Todo',
    id: string,
    name: string,
    description: string | null,
  }>
}

const createNewTodo = (state: ReducerState, dispatch: (action: any) => void) => async () => {
  dispatch({ type: START_LOADING });
  const todo = { name: state.newTitle, description: state.newDescription };
  await API.graphql(graphqlOperation(createTodo, { input: todo }))
    .then(() => dispatch({ type: CLEAR_NEW }));
};

const updateCurrentTodo = async (oldTodo: any, completed: boolean) => {
  const todo = { ...oldTodo, completed };
  await API.graphql(graphqlOperation(updateTodo, { input: todo }));
};


const ToDoList = () => {

  // @ts-ignore
  const [state, dispatch] = useReducer<(state: ReducerState, action: any) => any, ReducerState>(reducer, initialState);

  useEffect(() => {
    async function getData(offset?: string) {
      const todoData: any = await API.graphql(graphqlOperation(listTodos));
      dispatch({ type: QUERY, todos: todoData.data.listTodos.items });
      if (todoData.data.listTodos.nextToken) {
        await getData(todoData.data.listTodos.nextToken);
      }
    }

    getData();
    const subscription = API.graphql(graphqlOperation(onCreateTodo)).subscribe({
      next: (eventData) => {
        const todo = eventData.value.data.onCreateTodo;
        LayoutAnimation.easeInEaseOut();
        dispatch({ type: SUBSCRIPTION, todo });
      },
    });
    const updateSubscription = API.graphql(graphqlOperation(onUpdateTodo)).subscribe({
      next: (eventData) => {
        const todo = eventData.value.data.onUpdateTodo;
        LayoutAnimation.easeInEaseOut();
        dispatch({ type: UPDATE, todo });
      },
    });

    return () => subscription.unsubscribe();
  }, []);


  return (
    <View>
      <Text category={'h1'}>theFactor.e ToDo</Text>
      {state.todos.length === 0 ? <ActivityIndicator/> : null}
      <ScrollView><List data={state.todos} renderItem={renderTodo}/></ScrollView>
      <Input placeholder={'ToDo'} editable={state.disabled} value={state.newTitle}
             onChangeText={(title) => dispatch({ title, type: SET_TITLE })}/>
      <Input placeholder={'Description'} editable={state.disabled} value={state.newDescription}
             onChangeText={(description) => dispatch({ description, type: SET_DESCRIPTION })}/>
      <Button disabled={state.disabled} title={'Create ToDo'} onPress={createNewTodo(state, dispatch)}/>
    </View>
  );
};

const renderTodo = ({ item }: any) => {
  return (<ListItem
    title={`${item.name}`}
    description={`${item.description}`}
    descriptionStyle={item.completed ? { textDecorationLine: 'line-through', textDecorationStyle: 'solid' } : {}}
    titleStyle={item.completed ? { textDecorationLine: 'line-through', textDecorationStyle: 'solid' } : {}}
    icon={() => <Icon name={!item.completed ? 'circle' : 'check-circle'} style={{color: "#fff"}} size={25}/>}
    onPress={() => updateCurrentTodo(item, !item.completed)}
  />);
};

export default withAuthenticator(ToDoList, {
  signUpConfig: {
    hiddenDefaults: ['phone_number', 'email'],
  },
});

