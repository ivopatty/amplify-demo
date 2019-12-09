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


/** Manage local state
 *
 * @param state     The current state
 * @param action    The action to take on the state
 */
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

/**
 * Create a new Item
 *
 * @param state       What the user has entered
 * @param dispatch    Dispatch that we've created a new item to the app
 */
const createNewTodo = (state: ReducerState, dispatch: (action: any) => void) => async () => {
  dispatch({ type: START_LOADING });
  // convert the new Title, Image and Description to a new TODO
  const todo = { name: state.newTitle, description: state.newDescription };
  // Store the item in the API
  await API.graphql(graphqlOperation(                     // Talk to the AWS API
    createTodo,                                           // What AWS API to use?
    { input: todo }))                             // What Input to send
    .then(() => dispatch({ type: CLEAR_NEW }));     // Clear the input of the user
};

/**
 * Update server item based on action fo user
 *
 * @param oldTodo     The current item
 * @param completed   Mark item as done or clear status
 */
const updateCurrentTodo = async (oldTodo: any, completed: boolean) => {
  const todo = { ...oldTodo, completed };
  await API.graphql(graphqlOperation(                   // Talk to the AWS API again
    updateTodo,                                         // What AWS API to use
    { input: todo }));                          // Send the new TODO
};


/**
 * View Logic
 * This is where we render the component to show the list of TODOS
 */
const ToDoList = () => {

  // @ts-ignore
  const [state, dispatch] = useReducer<(state: ReducerState, action: any) => any, ReducerState>(reducer, initialState);

  /**
   * Get the data from the API
   */
  useEffect(() => {
    async function getData(offset?: string) {
      const todoData: any = await API.graphql(graphqlOperation(listTodos));
      dispatch({ type: QUERY, todos: todoData.data.listTodos.items });
      if (todoData.data.listTodos.nextToken) {
        await getData(todoData.data.listTodos.nextToken);
      }
    }
    getData();
    // Subscribe to created ToDos
    const subscription = API.graphql(graphqlOperation(onCreateTodo)).subscribe({
      next: (eventData) => {
        const todo = eventData.value.data.onCreateTodo;
        dispatch({ type: SUBSCRIPTION, todo });
      },
    });
    // Subscribe to updated TODOs for real time checking
    const updateSubscription = API.graphql(graphqlOperation(onUpdateTodo)).subscribe({
      next: (eventData) => {
        const todo = eventData.value.data.onUpdateTodo;
        dispatch({ type: UPDATE, todo });
      },
    });

    return () => {
      subscription.unsubscribe();
      updateSubscription.unsubscribe()
    }
  }, []);

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

export default withAuthenticator(ToDoList, {
  signUpConfig: {
    hiddenDefaults: ['phone_number', 'email'],
  },
});

