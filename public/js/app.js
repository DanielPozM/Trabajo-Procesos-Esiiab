import {apiClient} from './apiClient.js';document.querySelector('#load').onclick=async()=>document.querySelector('#out').textContent=JSON.stringify(await apiClient.getUsers(),null,2);
