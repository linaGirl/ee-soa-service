### actions
list (get)
create (post)
update (put)
delete (delete)
link (put)
unlink (delete)
describe (options)





#### status codes and classes
success
    success                         200         data_body
    accepted                        202         redirect_body
    created                         201         redirect_body
    redirect                        307 302     redirect_body
    moved                           308 301     redirect_body
    not_modified                    304         empty_body
    
error
    conflict                        409         error_body
    invalid_input                   400         error_body
    missing_input                   400         error_body
    not_found                       404         error_body

parser_error
    invalid_request                 400         error_body
    invalid_header                  400         error_body
    invalid_body                    415         error_body
    
request_error
    service_not_found               404         error_body
    object_not_found                404         error_body
    action_not_found                501         error_body
    unauthorized                    401         error_body
    forbidden                       403         error_body
    rate_limit_exceeded             429         error_body
    size_limit_exceeded             413         error_body
    version_not_satisfiable         406         error_body
    api_version_not_satisfiable     406         error_body
    language_not_satisfiable        406         error_body
    format_not_satisfiable          406         error_body
    range_not_satisfiable           416         error_body
    filter_too_complex              400         error_body
    selection_too_large             400         error_body
 
server_error
    service_error                   500         error_body
    service_not_available           503         error_body
    request_timeout                 408         error_body



todo:
- add headers
    - meta
    - id
    
- reimplement soa-service
- reinplement soa-message
- reimplement controllers



### redirect_body
    {
          application   : 'mothership'
        , service       : 'user'
        , resource      : 'accessToken'
        , statusClass   : 'success'
        , status        : 'accepted'
        , kind          : 'distributed-redirect'
        , id            : '23bbbiod234-h32p2-d2n332-23d232:0'
        , api-version   : 2.0.43
        , credits: {
              cost          : 3422
            , total         : 789138
            , remaining     : 2332984
            , rate          : 100000
            , interval      : 60
            , requests      : 56
        }
        , data: {
              wait          : 5432
            , request: {
                  url           : '/user/accessToken/89'
                , method        : 'get'
                , headers: {
                      api-version   : 2.0.43
                    , meta          : 'all'
                    , token         : '3487956fasio7zrysovtt7asbo87as09gf78zeb0fgzb0pb'
                }
            }
        }
    }





### error_body
    {
          application   : 'mothership'
        , service       : 'user'
        , resource      : 'accessToken'
        , statusClass   : 'error'
        , status        : 'conflict'
        , kind          : 'distributed-error'
        , id            : '23bbbiod234-h32p2-d2n332-23d232:0'
        , api-version   : 2.0.43
        , credits: {
              cost          : 3422
            , total         : 789138
            , remaining     : 2332984
            , rate          : 100000
            , interval      : 60
            , requests      : 56
        }
        , describe: {
              url           : '/user/accessToken'
            , method        : 'options'
            , headers: {
                  api-version   : 2.0.43
                , meta          : 'all'
                , token         : '3487956fasio7zrysovtt7asbo87as09gf78zeb0fgzb0pb'
            }              
        }
        , data: {
              code          : 'user_exists'
            , message       : 'The user with the email address x@y.com is already registred!'
            , translation   : 'Der Benutzer mit der E-Mail Adresse x@y.com ist bereits registriert!'
        }
    }




### data_body
    {
          application   : 'mothership'
        , service       : 'eventData'
        , resource      : 'event'
        , statusClass   : 'success'
        , status        : 'success'
        , kind          : 'distributed-custom-crud'
        , id            : '23bbbiod234-h32p2-d2n332-23d232:0'
        , api-version   : 2.0.43
        , credits: {
              cost          : 3422
            , total         : 789138
            , remaining     : 2332984
            , rate          : 100000
            , interval      : 60
            , requests      : 56
        }
        , range: {
              from          : 0
            , to            : 9
            , type          : 'rows'
        }
        , next: {
              url           : '/eventData/event'
            , method        : 'get'
            , headers: {
                  select        : '*, venue.*'
                , filter        : 'startDate>=now()'
                , accept        : 'application/json'
                , languages     : 'en, nl'
                , range         : 'rows=10-19'
                , api-version   : 2.0.43
                , meta          : 'next, prev'
                , id            : '23bbbiod234-h32p2-d2n332-23d232:0:0@0'
                , token         : '3487956fasio7zrysovtt7asbo87as09gf78zeb0fgzb0pb'
            }              
        }
        , data: [{
              id            : 235344
            , startDate     : '2016-02-16'
            , venue: {
                  application   : 'mothership'
                , service       : 'eventData'
                , resource      : 'venue'
                , statusClass   : 'success'
                , status        : 'success'
                , kind          : 'distributed-crud'
                , id            : '23bbbiod234-h32p2-d2n332-23d232:0:0'
                , api-version   : 2.0.43
                , credits: {
                      cost          : 7884
                    , total         : 789138
                }
                , range: {
                      from          : 0
                    , to            : 9
                    , type          : 'rows'
                }
                , next: {
                      url           : '/eventData/venue'
                    , method        : 'get'
                    , headers: {
                          select        : '*, venue.*'
                        , filter        : 'startDate>=now()'
                        , accept        : 'application/json'
                        , languages     : 'en, nl'
                        , range         : 'rows=10-19'
                        , api-version   : 2.0.43
                        , meta          : 'next, prev'
                        , id            : '23bbbiod234-h32p2-d2n332-23d232:0:0@0'
                        , token         : '3487956fasio7zrysovtt7asbo87as09gf78zeb0fgzb0pb'
                    }              
                }
                , data: []
            }
        }]
    }
